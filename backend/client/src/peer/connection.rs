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

use super::signal::Signal;

#[derive(Debug)]
pub struct PeerConnection {
    _id: ConnId,
    identity: String,
    client_id: String,
    rtc: Rtc,
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
    pub fn new(socket: &UdpSocket, identity: String, client_id: String, topic: String) -> Self {
        static ID_COUNTER: AtomicU64 = AtomicU64::new(0);
        let next_id = ID_COUNTER.fetch_add(1, Ordering::SeqCst);
        let mut rtc = Rtc::new();

        // Add the shared UDP socket as a host candidate
        let addr = socket.local_addr().expect("a local socket adddress");
        let candidate = Candidate::host(addr, "udp").expect("a host candidate");
        rtc.add_local_candidate(candidate);

        log::debug!("Client ({}) created", client_id);

        PeerConnection {
            _id: ConnId(next_id),
            identity,
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
            log::warn!("Client ({}) disconnected: {:?}", self.client_id, e);
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
        log::debug!("Client ({}) sending {} bytes", self.client_id, data.len());
        self.rtc
            .channel(self.cid.expect("channel to exist"))
            .expect("channel to exist")
            .write(true, &data)
    }

    pub fn handle_signal(&mut self, signal: Signal) {
        match signal {
            Signal::Renegotiate(renegotiate) if renegotiate => {
                // TODO: not sure what this means
                log::warn!("Renegotiate not implemented");
            }
            Signal::Candidate(candidate) => {
                log::debug!("Received candidate ({})", self.client_id);
                self.rtc.add_remote_candidate(candidate);
            }
            Signal::SdpAnswer(sdp) => {
                log::debug!("Received answer ({})", self.client_id);
                self.handle_answer(sdp);
            }
            Signal::SdpOffer(sdp) => {
                log::debug!("Received offer ({})", self.client_id);
                let answer = self.handle_offer(sdp);

                self.signals_to_propagate
                    .push_back(Signal::SdpAnswer(answer));
            }
            _ => {}
        }
    }

    pub fn poll_output(&mut self, socket: &UdpSocket) -> Propagated {
        if !self.rtc.is_alive() {
            return Propagated::Noop;
        }

        while let Some(signal) = self.signals_to_propagate.pop_front() {
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
                log::warn!("Client ({}) poll_output failed: {:?}", self.client_id, e);
                self.rtc.disconnect();
                Propagated::Noop
            }
        }
    }

    fn handle_output(&mut self, output: Output, socket: &UdpSocket) -> Propagated {
        match output {
            Output::Transmit(transmit) => {
                socket
                    .send_to(&transmit.contents, transmit.destination)
                    .expect("sending UDP data");
                Propagated::Noop
            }
            Output::Timeout(t) => Propagated::Timeout(t),
            Output::Event(e) => match e {
                Event::Connected => {
                    log::info!("Client ({}) connected", self.client_id);
                    Propagated::Noop
                }
                Event::IceConnectionStateChange(v) => {
                    if v == IceConnectionState::Disconnected {
                        // Ice disconnect could result in trying to establish a new connection,
                        // but this impl just disconnects directly.
                        self.rtc.disconnect();
                    }
                    Propagated::Noop
                }
                Event::ChannelOpen(cid, topic) => {
                    log::info!("Client ({}) opened channel: {:?}", self.client_id, topic);
                    self.cid = Some(cid);
                    Propagated::Connected(self.topic.clone())
                }
                Event::ChannelData(data) => self.handle_channel_data(data),
                _ => Propagated::Noop,
            },
        }
    }

    fn handle_channel_data(&mut self, d: ChannelData) -> Propagated {
        log::debug!(
            "Client ({}) received {} bytes",
            self.client_id,
            d.data.len()
        );
        // TODO: Accept a data-channel per topic, and let the channel name determine the topic
        Propagated::Data(self.topic.clone(), d.data)
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
