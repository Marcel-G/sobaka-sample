use std::{
    collections::VecDeque,
    io::ErrorKind,
    net::{IpAddr, UdpSocket},
    time::Instant,
};

use serde_json::Value;
use str0m::{
    change::{SdpAnswer, SdpOffer, SdpPendingOffer},
    channel::ChannelId,
    net::{Protocol, Receive},
    Candidate, Event as RTCEvent, IceConnectionState, Input, Output, Rtc,
};
use systemstat::{Platform, System};
use yrs::updates::{decoder::Decode, encoder::Encode};

use super::signal::Signal;

pub struct PeerConnection {
    state: State,
    rtc: Rtc,
    socket: UdpSocket,
    pending_messages: VecDeque<Vec<u8>>,
    receive_buffer: Vec<u8>,
}

#[derive(Debug)]
enum Negotiation {
    Initiator {
        pending_signals: VecDeque<Signal>,
        pending_offer: Option<SdpPendingOffer>,
        candidates: Vec<Candidate>,
    },
    Responder {
        pending_signals: VecDeque<Signal>,
        candidates: Vec<Candidate>,
    },
}

#[derive(Debug)]
struct Ready {
    channel: Option<ChannelId>,
}

#[derive(Debug)]
enum State {
    Waiting,
    Negotiating(Negotiation),
    Ready(Ready),
    Closed,
}

#[derive(Debug)]
pub enum PeerConnError {
    SdpError,
    ChannelDoesntExist,
    DecodeError,
    WebRtc,
}

pub enum PeerConnEvent {
    // https://github.com/feross/simple-peer/blob/f1a492d1999ce727fa87193ebdea20ac89c1fc6d/README.md?plain=1#L315
    OutboundSignal(Signal),
    IncomingMessage(yrs::sync::Message),
}

impl PeerConnection {
    pub fn new() -> Self {
        let mut rtc = Rtc::new();
        let socket = create_rtc_socket();

        let addr = socket.local_addr().expect("a local socket adddress");
        let candidate = Candidate::host(addr, "udp").expect("a host candidate");
        rtc.add_local_candidate(candidate);

        Self {
            rtc,
            socket,
            state: State::Waiting,
            pending_messages: Default::default(),
            receive_buffer: Vec::new(),
        }
    }

    pub fn close(&mut self) {
        self.rtc.disconnect()
    }

    pub fn handle_incoming_signal(&mut self, signal: Value) {
        let Ok(signal) = serde_json::from_value::<Signal>(signal.clone()) else {
            // mDNS signals are not supported by Candidate, if one is received, ignore it.
            log::warn!(
                "failed to parse signal, ignoring it, {}",
                signal.to_string()
            );
            return;
        };

        match signal {
            Signal::Renegotiate(renegotiate) if renegotiate => {
                // TODO: not sure what this means
            }
            Signal::Candidate(candidate) => {
                self.remote_candidate(candidate);
            }
            Signal::SdpAnswer(sdp) => {
                self.accept_answer(sdp).expect("Failed to accept answer");
            }
            Signal::SdpOffer(sdp) => {
                self.accept_offer(sdp).expect("Failed to accept offer");
            }
            _ => {}
        }
    }

    fn remote_candidate(&mut self, candidate: Candidate) {
        match &mut self.state {
            State::Negotiating(Negotiation::Initiator { candidates, .. }) => {
                candidates.push(candidate);
            }
            State::Negotiating(Negotiation::Responder { candidates, .. }) => {
                candidates.push(candidate);
            }
            _ => self.rtc.add_remote_candidate(candidate),
        }
    }

    pub fn send(&mut self, message: yrs::sync::Message) {
        self.pending_messages.push_back(message.encode_v1());
    }

    fn create_offer(&mut self) {
        let mut sdp = self.rtc.sdp_api();
        sdp.add_channel("data".to_string());
        let (offer, pending) = sdp.apply().expect("Should create offer");

        let mut pending_signals: VecDeque<Signal> = Default::default();

        // Emit offer via signal
        pending_signals.push_back(Signal::SdpOffer(offer));

        self.state = State::Negotiating(Negotiation::Initiator {
            pending_offer: Some(pending),
            pending_signals,
            candidates: Default::default(),
        });
    }

    fn accept_answer(&mut self, answer: SdpAnswer) -> Result<(), PeerConnError> {
        match &mut self.state {
            State::Negotiating(Negotiation::Initiator {
                pending_offer,
                candidates,
                ..
            }) => {
                self.rtc
                    .sdp_api()
                    .accept_answer(pending_offer.take().ok_or(PeerConnError::SdpError)?, answer)
                    .expect("Failed to accept answer");

                for candidate in candidates.drain(..) {
                    self.rtc.add_remote_candidate(candidate);
                }

                self.rtc.sdp_api().add_channel("testing123".to_string());

                Ok(())
            }
            _ => panic!("Invalid state for accepting answer"),
        }
    }

    pub fn connect(&mut self, initiator: bool) {
        if initiator {
            // Active (AKA Initiator) path: https://github.com/algesten/str0m/tree/7170c3a3a5ef2d9446ac7193b5d2faa79e577a2a?tab=readme-ov-file#active
            // 1. Create an offer
            // 2. Send the offer to the remote peer
            // 3. Receive an answer from the remote peer
            // 4. Accept the answer
            // For creating SignalEvent::Signal event signal
            self.create_offer();
        } else {
            // Passive path: https://github.com/algesten/str0m/tree/7170c3a3a5ef2d9446ac7193b5d2faa79e577a2a?tab=readme-ov-file#passive
            // 1. Incoming offer from remote peer
            // 2. Forward the answer to the remote peer. (via signaling conn)
            self.state = State::Negotiating(Negotiation::Responder {
                candidates: Default::default(),
                pending_signals: Default::default(),
            });
        }
    }

    /// For consuming SignalEvent::Signal event signal
    fn accept_offer(&mut self, offer: SdpOffer) -> Result<(), PeerConnError> {
        match &mut self.state {
            State::Negotiating(Negotiation::Responder {
                candidates,
                pending_signals,
                ..
            }) => {
                let answer = self
                    .rtc
                    .sdp_api()
                    .accept_offer(offer)
                    .map_err(|_| PeerConnError::SdpError)?;

                for candidate in candidates.drain(..) {
                    self.rtc.add_remote_candidate(candidate);
                }

                pending_signals.push_back(Signal::SdpAnswer(answer));

                Ok(())
            }
            _ => Err(PeerConnError::SdpError),
        }
    }

    fn on_connection_opened(&mut self) {
        self.state = State::Ready(Ready { channel: None });
    }

    fn on_connection_closed(&mut self) {
        self.state = State::Closed;
    }

    fn on_channel_opened(&mut self, channel_id: ChannelId, _name: String) {
        if let State::Ready(ready) = &mut self.state {
            ready.channel = Some(channel_id);
        }
    }

    fn on_channel_closed(&mut self, channel_id: ChannelId) {
        if let State::Ready(ready) = &mut self.state {
            if let Some(id) = ready.channel {
                if id == channel_id {
                    ready.channel = None;
                    return;
                }
            }
            panic!("Channel closed that was not open")
        }
        panic!("Channel closed but not in ready state")
    }

    fn on_inbound_data(
        &mut self,
        _channel_id: ChannelId,
        data: Vec<u8>,
    ) -> Result<yrs::sync::Message, PeerConnError> {
        yrs::sync::Message::decode_v1(&data).map_err(|_| PeerConnError::DecodeError)
    }

    fn on_outbound_data(
        &mut self,
        channel_id: ChannelId,
        data: Vec<u8>,
    ) -> Result<(), PeerConnError> {
        self.rtc
            .channel(channel_id)
            .ok_or(PeerConnError::ChannelDoesntExist)?
            .write(true, &data)
            .map_err(|_| PeerConnError::WebRtc)?;
        Ok(())
    }

    pub fn poll_output(&mut self) -> Result<Option<PeerConnEvent>, PeerConnError> {
        loop {
            // 1. Work on the RTC connection
            //
            // Poll output until we get a timeout. The timeout means we are either awaiting UDP socket input
            // or the timeout to happen.
            let timeout = match self.rtc.poll_output() {
                Ok(Output::Timeout(v)) => v,
                Ok(Output::Transmit(v)) => {
                    self.socket
                        .send_to(&v.contents, v.destination)
                        .expect("Failed to send data");
                    continue;
                }
                Ok(Output::Event(v)) => match v {
                    RTCEvent::IceConnectionStateChange(IceConnectionState::Disconnected) => {
                        // TODO: disconnect is not a full close
                        // Connection failed. This is a less stringent test than `failed` and may trigger
                        // intermittently and resolve just as spontaneously on less reliable networks,
                        // or during temporary disconnections. When the problem resolves, the connection
                        // may return to the connected state.
                        self.on_connection_closed();

                        continue;
                    }
                    RTCEvent::IceConnectionStateChange(IceConnectionState::Connected)
                    | RTCEvent::IceConnectionStateChange(IceConnectionState::Completed) => {
                        self.on_connection_opened();

                        continue;
                    }
                    RTCEvent::ChannelOpen(channel_id, name) => {
                        self.on_channel_opened(channel_id, name);

                        continue;
                    }
                    RTCEvent::ChannelClose(channel_id) => {
                        self.on_channel_closed(channel_id);

                        continue;
                    }
                    RTCEvent::ChannelData(info) => {
                        return self
                            .on_inbound_data(info.id, info.data)
                            .map(|event| Some(PeerConnEvent::IncomingMessage(event)))
                    }
                    _ => {
                        continue;
                    }
                },
                _ => {
                    continue;
                }
            };

            let timeout = timeout - Instant::now();

            if timeout.is_zero() {
                self.rtc
                    .handle_input(Input::Timeout(Instant::now()))
                    .expect("Failed to handle input");
                continue;
            }

            // 2. Flush any pending messages to go out
            match &mut self.state {
                State::Negotiating(Negotiation::Initiator {
                    pending_signals, ..
                })
                | State::Negotiating(Negotiation::Responder {
                    pending_signals, ..
                }) => {
                    if let Some(signal) = pending_signals.pop_front() {
                        return Ok(Some(PeerConnEvent::OutboundSignal(signal)));
                    }
                }
                State::Ready(Ready {
                    channel: Some(channel_id),
                }) => {
                    let id = channel_id.clone();
                    if let Some(data) = self.pending_messages.pop_front() {
                        self.on_outbound_data(id, data)?;
                        continue;
                    }
                }
                _ => {}
            }

            // 3. Poll the UDP socket for incoming data
            self.socket
                .set_nonblocking(true)
                .expect("Failed to set non-blocking mode");
            self.socket
                .set_read_timeout(Some(timeout))
                .expect("Failed to set read timeout");
            self.receive_buffer.resize(2000, 0);

            let input = match self.socket.recv_from(&mut self.receive_buffer) {
                Ok((n, source)) => {
                    self.receive_buffer.truncate(n);
                    Input::Receive(
                        Instant::now(),
                        Receive {
                            proto: Protocol::Udp,
                            source,
                            destination: self.socket.local_addr().unwrap(),
                            contents: self
                                .receive_buffer
                                .as_slice()
                                .try_into()
                                .expect("Failed to convert buffer to slice"),
                        },
                    )
                }
                Err(e) => match e.kind() {
                    // Expected error for set_read_timeout(). One for windows, one for the rest.
                    ErrorKind::WouldBlock | ErrorKind::TimedOut => Input::Timeout(Instant::now()),
                    _ => return Err(PeerConnError::WebRtc),
                },
            };

            self.rtc
                .handle_input(input)
                .map_err(|_| PeerConnError::WebRtc)?;

            return Ok(None);
        }
    }
}

fn select_host_address() -> IpAddr {
    let system = System::new();
    let networks = system.networks().unwrap();

    for net in networks.values() {
        for n in &net.addrs {
            if let systemstat::IpAddr::V4(v) = n.addr {
                if !v.is_loopback() && !v.is_link_local() && !v.is_broadcast() {
                    return IpAddr::V4(v);
                }
            }
        }
    }

    panic!("Found no usable network interface");
}

fn create_rtc_socket() -> UdpSocket {
    let addr = select_host_address();
    // Spin up a UDP socket for the RTC
    UdpSocket::bind(format!("{addr}:0")).expect("binding a random UDP port")
}
