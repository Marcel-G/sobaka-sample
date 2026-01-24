use std::{
    collections::{HashMap, HashSet, VecDeque},
    net::UdpSocket,
    ops::Deref,
    sync::atomic::{AtomicU64, Ordering},
    time::Instant,
};

use str0m::{
    change::{SdpAnswer, SdpOffer, SdpPendingOffer},
    channel::{ChannelData, ChannelId},
    Candidate, Event, IceConnectionState, Input, Output, Rtc, RtcError,
};
use tracing::{debug, error, info, trace, warn};

use super::{
    encoder::{decode_packet, encode_packet, packet_array, PacketReassembler, CHUNK_SIZE},
    signal::Signal,
};

/// A peer connection that supports multiple data channels (one per topic).
/// 
/// This allows reusing a single RTCPeerConnection for multiple topics,
/// with each topic having its own data channel. The channel name is the topic name.
#[derive(Debug)]
pub struct PeerConnection {
    _id: ConnId,
    identity: String,
    client_id: String,
    rtc: Rtc,
    tx_ordinal: u64,
    packet_queue: PacketReassembler,
    pending: Option<SdpPendingOffer>,
    signals_to_propagate: VecDeque<Signal>,
    /// Topics this connection is subscribed to
    topics: HashSet<String>,
    /// Map of topic -> channel ID
    channels: HashMap<String, ChannelId>,
    /// Map of channel ID -> topic (for incoming data routing)
    channel_topics: HashMap<ChannelId, String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct ConnId(u64);

impl Deref for ConnId {
    type Target = u64;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl PeerConnection {
    /// Create a new peer connection for a client.
    /// Topics are added via `add_topic()` after creation.
    pub fn new(candidate: Candidate, identity: String, client_id: String) -> Self {
        static ID_COUNTER: AtomicU64 = AtomicU64::new(0);
        let next_id = ID_COUNTER.fetch_add(1, Ordering::SeqCst);
        let mut rtc = Rtc::new();

        debug!(
            conn_id = next_id,
            client_id = %client_id,
            identity = %identity,
            "Creating new peer connection"
        );

        rtc.add_local_candidate(candidate);

        PeerConnection {
            _id: ConnId(next_id),
            identity,
            tx_ordinal: 0,
            packet_queue: PacketReassembler::new(),
            signals_to_propagate: VecDeque::default(),
            client_id,
            topics: HashSet::new(),
            channels: HashMap::new(),
            channel_topics: HashMap::new(),
            rtc,
            pending: None,
        }
    }

    /// Add a topic to this connection.
    /// A data channel will be created/accepted for this topic.
    pub fn add_topic(&mut self, topic: String) {
        if self.topics.contains(&topic) {
            return;
        }
        
        debug!(
            client_id = %self.client_id,
            topic = %topic,
            "Adding topic to peer connection"
        );
        
        self.topics.insert(topic);
    }

    /// Check if this connection has a specific topic
    pub fn has_topic(&self, topic: &str) -> bool {
        self.topics.contains(topic)
    }

    /// Get all topics this connection is subscribed to
    pub fn topics(&self) -> impl Iterator<Item = &String> {
        self.topics.iter()
    }

    pub fn accepts(&self, input: &Input) -> bool {
        self.rtc.accepts(input)
    }

    pub fn identity(&self) -> &str {
        &self.identity
    }

    pub fn handle_input(&mut self, input: Input) {
        if !self.rtc.is_alive() {
            return;
        }

        if let Err(e) = self.rtc.handle_input(input) {
            warn!(
                client_id = %self.client_id,
                error = ?e,
                "Client disconnected due to input error"
            );
            self.rtc.disconnect();
        }
    }

    pub fn is_alive(&self) -> bool {
        self.rtc.is_alive()
    }

    pub fn client_id(&self) -> &str {
        &self.client_id
    }

    /// Send data on a specific topic's channel
    pub fn send(&mut self, topic: &str, data: Vec<u8>) -> Result<usize, RtcError> {
        let data_len = data.len();
        self.tx_ordinal += 1;
        let packets = packet_array(&data, self.tx_ordinal, CHUNK_SIZE);

        trace!(
            client_id = %self.client_id,
            topic = %topic,
            bytes = data_len,
            chunks = packets.len(),
            tx_ord = self.tx_ordinal,
            "Sending data to client"
        );

        let Some(cid) = self.channels.get(topic) else {
            error!(
                client_id = %self.client_id,
                topic = %topic,
                "No channel available for topic"
            );
            return Ok(0);
        };

        let Some(mut channel) = self.rtc.channel(*cid) else {
            error!(
                client_id = %self.client_id,
                topic = %topic,
                "Channel not found"
            );
            return Ok(0);
        };

        let mut sent = 0;
        for packet in packets.iter() {
            let encoded = encode_packet(packet);
            sent += channel.write(true, &encoded)?;
        }

        debug!(
            client_id = %self.client_id,
            topic = %topic,
            bytes_sent = sent,
            "Data sent successfully"
        );

        Ok(sent)
    }

    pub fn handle_signal(&mut self, signal: Signal) {
        match signal {
            Signal::Renegotiate(renegotiate) if renegotiate => {
                warn!(
                    client_id = %self.client_id,
                    "Renegotiate requested but not implemented"
                );
            }
            Signal::Candidate(candidate) => {
                debug!(
                    client_id = %self.client_id,
                    candidate = ?candidate,
                    "Adding remote ICE candidate"
                );
                self.rtc.add_remote_candidate(candidate);
            }
            Signal::SdpAnswer(sdp) => {
                debug!(client_id = %self.client_id, "Processing SDP answer");
                self.handle_answer(sdp);
            }
            Signal::SdpOffer(sdp) => {
                debug!(client_id = %self.client_id, "Processing SDP offer");
                let answer = self.handle_offer(sdp);
                self.signals_to_propagate
                    .push_back(Signal::SdpAnswer(answer));
            }
            _ => {
                trace!(client_id = %self.client_id, "Ignoring unknown signal type");
            }
        }
    }

    pub fn poll_output(&mut self, socket: &UdpSocket) -> Propagated {
        if !self.rtc.is_alive() {
            return Propagated::Noop;
        }

        while let Some(signal) = self.signals_to_propagate.pop_front() {
            // Use the first topic for signaling (signals are connection-wide)
            if let Some(topic) = self.topics.iter().next() {
                trace!(client_id = %self.client_id, topic = %topic, "Propagating signal");
                return Propagated::Signal(topic.clone(), signal);
            }
        }

        // Incoming tracks from other clients cause new entries in track_out that
        // need SDP negotiation with the remote peer.
        if self.negotiate_if_needed() {
            return Propagated::Noop;
        }

        match self.rtc.poll_output() {
            Ok(output) => self.handle_output(output, socket),
            Err(e) => {
                warn!(
                    client_id = %self.client_id,
                    error = ?e,
                    "poll_output failed, disconnecting"
                );
                self.rtc.disconnect();
                Propagated::Noop
            }
        }
    }

    fn handle_output(&mut self, output: Output, socket: &UdpSocket) -> Propagated {
        match output {
            Output::Transmit(transmit) => {
                if let Err(e) = socket.send_to(&transmit.contents, transmit.destination) {
                    error!(
                        client_id = %self.client_id,
                        destination = %transmit.destination,
                        error = %e,
                        "Failed to send UDP data"
                    );
                }
                Propagated::Noop
            }
            Output::Timeout(t) => Propagated::Timeout(t),
            Output::Event(e) => match e {
                Event::Connected => {
                    info!(
                        client_id = %self.client_id,
                        identity = %self.identity,
                        topics = ?self.topics,
                        "WebRTC connection established"
                    );
                    Propagated::Noop
                }
                Event::IceConnectionStateChange(state) => {
                    debug!(
                        client_id = %self.client_id,
                        state = ?state,
                        "ICE connection state changed"
                    );

                    if state == IceConnectionState::Disconnected {
                        info!(
                            client_id = %self.client_id,
                            "ICE disconnected, closing connection"
                        );
                        self.rtc.disconnect();
                    }
                    Propagated::Noop
                }
                Event::ChannelOpen(cid, channel_name) => {
                    // Channel name is the topic name
                    let topic = channel_name.clone();
                    
                    info!(
                        client_id = %self.client_id,
                        topic = %topic,
                        "Data channel opened for topic"
                    );
                    
                    // Register the channel for this topic
                    self.channels.insert(topic.clone(), cid);
                    self.channel_topics.insert(cid, topic.clone());
                    self.topics.insert(topic.clone());
                    
                    Propagated::Connected(topic)
                }
                Event::ChannelData(data) => self.handle_channel_data(data),
                other => {
                    trace!(
                        client_id = %self.client_id,
                        event = ?other,
                        "Ignoring RTC event"
                    );
                    Propagated::Noop
                }
            },
        }
    }

    fn handle_channel_data(&mut self, d: ChannelData) -> Propagated {
        // Determine the topic from the channel ID
        let topic = match self.channel_topics.get(&d.id) {
            Some(t) => t.clone(),
            None => {
                warn!(
                    client_id = %self.client_id,
                    channel_id = ?d.id,
                    "Received data on unknown channel"
                );
                return Propagated::Noop;
            }
        };

        trace!(
            client_id = %self.client_id,
            topic = %topic,
            bytes = d.data.len(),
            "Received channel data"
        );

        let packet = match decode_packet(&d.data) {
            Ok(p) => p,
            Err(e) => {
                error!(
                    client_id = %self.client_id,
                    topic = %topic,
                    error = %e,
                    "Failed to decode packet"
                );
                return Propagated::Noop;
            }
        };

        if let Some(data) = self.packet_queue.process_packet(packet) {
            debug!(
                client_id = %self.client_id,
                topic = %topic,
                bytes = data.len(),
                "Complete message reassembled"
            );
            Propagated::Data(topic, data)
        } else {
            trace!(
                client_id = %self.client_id,
                topic = %topic,
                "Packet queued for reassembly"
            );
            Propagated::Noop
        }
    }

    fn negotiate_if_needed(&mut self) -> bool {
        if self.channels.is_empty() || self.pending.is_some() {
            // Don't negotiate if there are no data channels, or if we have pending changes already.
            return false;
        }

        let change = self.rtc.sdp_api();

        if !change.has_changes() {
            return false;
        }

        let Some((offer, pending)) = change.apply() else {
            return false;
        };

        self.signals_to_propagate.push_back(Signal::SdpOffer(offer));

        self.pending = Some(pending);

        true
    }

    fn handle_offer(&mut self, offer: SdpOffer) -> SdpAnswer {
        self.rtc
            .sdp_api()
            .accept_offer(offer)
            .expect("offer to be accepted")
    }

    fn handle_answer(&mut self, answer: SdpAnswer) {
        if let Some(pending) = self.pending.take() {
            self.rtc
                .sdp_api()
                .accept_answer(pending, answer)
                .expect("answer to be accepted");
        }
    }
}

/// Events propagated between client.
#[allow(clippy::large_enum_variant)]
#[derive(Debug)]
pub enum Propagated {
    /// When we have nothing to propagate.
    Noop,

    /// Poll client has reached timeout.
    Timeout(Instant),

    /// Client successfuly connected
    Connected(String),

    Data(String, Vec<u8>),

    Signal(String, Signal),
}
