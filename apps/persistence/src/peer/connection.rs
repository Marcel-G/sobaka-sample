use std::{
    collections::VecDeque,
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
    // TODO: Accept a data-channel per topic, and let the channel name determine the topic
    topic: String,
    cid: Option<ChannelId>,
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
    pub fn new(candidate: Candidate, identity: String, client_id: String, topic: String) -> Self {
        static ID_COUNTER: AtomicU64 = AtomicU64::new(0);
        let next_id = ID_COUNTER.fetch_add(1, Ordering::SeqCst);
        let mut rtc = Rtc::new();

        debug!(
            conn_id = next_id,
            client_id = %client_id,
            identity = %identity,
            topic = %topic,
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
            topic,
            rtc,
            pending: None,
            cid: None,
        }
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

    pub fn send(&mut self, _topic: String, data: Vec<u8>) -> Result<usize, RtcError> {
        let data_len = data.len();
        self.tx_ordinal += 1;
        let packets = packet_array(&data, self.tx_ordinal, CHUNK_SIZE);

        trace!(
            client_id = %self.client_id,
            bytes = data_len,
            chunks = packets.len(),
            tx_ord = self.tx_ordinal,
            "Sending data to client"
        );

        let Some(cid) = self.cid else {
            error!(client_id = %self.client_id, "No channel available for sending");
            return Err(RtcError::Other("No channel available".into()));
        };

        let Some(channel) = self.rtc.channel(cid) else {
            error!(client_id = %self.client_id, "Channel not found");
            return Err(RtcError::Other("Channel not found".into()));
        };

        let mut sent = 0;
        for packet in packets.iter() {
            let encoded = encode_packet(packet);
            sent += channel.write(true, &encoded)?;
        }

        debug!(
            client_id = %self.client_id,
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
            trace!(client_id = %self.client_id, "Propagating signal");
            return Propagated::Signal(self.topic.clone(), signal);
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
                        topic = %self.topic,
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
                    info!(
                        client_id = %self.client_id,
                        channel_name = ?channel_name,
                        "Data channel opened"
                    );
                    self.cid = Some(cid);
                    Propagated::Connected(self.topic.clone())
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
        trace!(
            client_id = %self.client_id,
            bytes = d.data.len(),
            "Received channel data"
        );

        let packet = match decode_packet(&d.data) {
            Ok(p) => p,
            Err(e) => {
                error!(
                    client_id = %self.client_id,
                    error = %e,
                    "Failed to decode packet"
                );
                return Propagated::Noop;
            }
        };

        if let Some(data) = self.packet_queue.process_packet(packet) {
            debug!(
                client_id = %self.client_id,
                bytes = data.len(),
                "Complete message reassembled"
            );
            Propagated::Data(self.topic.clone(), data)
        } else {
            trace!(
                client_id = %self.client_id,
                "Packet queued for reassembly"
            );
            Propagated::Noop
        }
    }

    fn negotiate_if_needed(&mut self) -> bool {
        if self.cid.is_none() || self.pending.is_some() {
            // Don't negotiate if there is no data channel, or if we have pending changes already.
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
