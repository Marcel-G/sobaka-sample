use std::{
    collections::{HashMap, HashSet, VecDeque},
    net::UdpSocket,
    ops::Deref,
    sync::atomic::{AtomicU64, Ordering},
    time::{Duration, Instant},
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
use crate::signal::protocol::PeerKind;

/// How long to wait without any activity before considering a connection dead.
/// WebRTC STUN keepalives happen every ~15-25 seconds, so 60s is generous.
const CONNECTION_TIMEOUT: Duration = Duration::from_secs(60);

/// A peer connection that supports multiple data channels (one per topic).
///
/// This allows reusing a single RTCPeerConnection for multiple topics,
/// with each topic having its own data channel. The channel name is the topic name.
#[derive(Debug)]
pub struct PeerConnection {
    _id: ConnId,
    identity: String,
    kind: PeerKind,
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
    /// Last time we saw any activity on this connection
    last_activity: Instant,
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
    ///
    /// The connection uses ICE-lite mode since the persistence node runs on a
    /// public IP in AWS. ICE-lite means we won't initiate STUN binding requests,
    /// only respond to them. Clients behind NAT will use their TURN servers
    /// to relay traffic to us.
    pub fn new(candidate: Candidate, identity: String, client_id: String, kind: PeerKind) -> Self {
        static ID_COUNTER: AtomicU64 = AtomicU64::new(0);
        let next_id = ID_COUNTER.fetch_add(1, Ordering::SeqCst);

        // Use ICE-lite mode for server with public IP
        // This tells peers we have a known public address and won't be behind NAT
        let mut rtc = Rtc::builder().set_ice_lite(true).build();

        debug!(
            conn_id = next_id,
            client_id = %client_id,
            identity = %identity,
            kind = ?kind,
            ice_lite = true,
            "Creating new peer connection (ICE-lite mode)"
        );

        rtc.add_local_candidate(candidate.clone());

        info!(
            client_id = %client_id,
            candidate = %candidate,
            "Added local ICE candidate"
        );

        PeerConnection {
            _id: ConnId(next_id),
            identity,
            kind,
            tx_ordinal: 0,
            packet_queue: PacketReassembler::new(),
            signals_to_propagate: VecDeque::default(),
            client_id,
            topics: HashSet::new(),
            channels: HashMap::new(),
            channel_topics: HashMap::new(),
            rtc,
            pending: None,
            last_activity: Instant::now(),
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
    pub fn topics(&self) -> &HashSet<String> {
        &self.topics
    }

    pub fn accepts(&self, input: &Input) -> bool {
        self.rtc.accepts(input)
    }

    pub fn identity(&self) -> &str {
        &self.identity
    }

    pub fn kind(&self) -> &PeerKind {
        &self.kind
    }

    pub fn handle_input(&mut self, input: Input) {
        if !self.rtc.is_alive() {
            return;
        }

        // Only update activity timestamp on actual network input (STUN, DTLS, SCTP, etc.)
        // NOT on timeout ticks, otherwise the timeout can never trigger
        if matches!(input, Input::Receive(..)) {
            self.last_activity = Instant::now();
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
        // Connection is dead if str0m says so
        if !self.rtc.is_alive() {
            return false;
        }
        
        // Also consider dead if no activity for too long
        if self.last_activity.elapsed() > CONNECTION_TIMEOUT {
            debug!(
                client_id = %self.client_id,
                elapsed_secs = self.last_activity.elapsed().as_secs(),
                "Connection timed out due to inactivity"
            );
            return false;
        }
        
        // If all channels have been closed, the connection is effectively dead
        // (but only after the connection was established - i.e., we had channels)
        // We check if channels is empty AND we've been alive for more than a few seconds
        // to avoid killing connections that are still being set up
        if self.channels.is_empty() && self.last_activity.elapsed() > Duration::from_secs(5) {
            debug!(
                client_id = %self.client_id,
                "Connection has no open channels"
            );
            return false;
        }
        
        true
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
                info!(
                    client_id = %self.client_id,
                    candidate_type = ?candidate.kind(),
                    candidate_addr = %candidate.addr(),
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
                if let Some(answer) = self.handle_offer(sdp) {
                    self.signals_to_propagate
                        .push_back(Signal::SdpAnswer(answer));
                }
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
                    match state {
                        IceConnectionState::Disconnected => {
                            // In ICE-lite mode, we may temporarily be in Disconnected state
                            // while waiting for the remote peer to send us traffic.
                            // The connection will recover when we receive a STUN request.
                            // If no traffic arrives within CONNECTION_TIMEOUT, is_alive() 
                            // will return false and the connection will be cleaned up.
                            debug!(
                                client_id = %self.client_id,
                                "ICE disconnected - waiting for peer traffic (timeout: {}s)",
                                CONNECTION_TIMEOUT.as_secs()
                            );
                        }
                        IceConnectionState::Completed => {
                            info!(
                                client_id = %self.client_id,
                                "ICE connection completed"
                            );
                        }
                        _ => {
                            debug!(
                                client_id = %self.client_id,
                                state = ?state,
                                "ICE connection state changed"
                            );
                        }
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
                Event::ChannelClose(cid) => {
                    // Channel has been closed by the remote peer
                    if let Some(topic) = self.channel_topics.remove(&cid) {
                        self.channels.remove(&topic);
                        self.topics.remove(&topic);
                        
                        info!(
                            client_id = %self.client_id,
                            topic = %topic,
                            "Data channel closed by remote peer"
                        );
                        
                        Propagated::Disconnected(topic)
                    } else {
                        debug!(
                            client_id = %self.client_id,
                            channel_id = ?cid,
                            "Unknown channel closed"
                        );
                        Propagated::Noop
                    }
                }
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

        // Pass topic to reassembler to prevent cross-topic packet mixing
        if let Some(data) = self.packet_queue.process_packet(&topic, packet) {
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

    fn handle_offer(&mut self, offer: SdpOffer) -> Option<SdpAnswer> {
        match self.rtc.sdp_api().accept_offer(offer) {
            Ok(answer) => Some(answer),
            Err(e) => {
                error!(
                    client_id = %self.client_id,
                    error = ?e,
                    "Failed to accept SDP offer"
                );
                None
            }
        }
    }

    fn handle_answer(&mut self, answer: SdpAnswer) {
        if let Some(pending) = self.pending.take() {
            if let Err(e) = self.rtc.sdp_api().accept_answer(pending, answer) {
                error!(
                    client_id = %self.client_id,
                    error = ?e,
                    "Failed to accept SDP answer"
                );
            }
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

    /// Client successfully connected to a topic
    Connected(String),

    /// Client disconnected from a topic (channel closed)
    Disconnected(String),

    /// Data received on a topic
    Data(String, Vec<u8>),

    /// Signaling message to send
    Signal(String, Signal),
}
