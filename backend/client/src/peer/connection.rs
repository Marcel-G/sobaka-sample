use core::panic;
use std::{
    collections::VecDeque,
    future::Future,
    io::{self},
    mem,
    net::IpAddr,
    pin::Pin,
    task::{Context, Poll},
    time::{Duration, Instant},
};

use futures::{future::BoxFuture, FutureExt};
use serde_json::Value;
use str0m::{
    change::{SdpAnswer, SdpOffer, SdpPendingOffer},
    channel::ChannelId,
    net::{Protocol, Receive},
    Candidate, Event as RTCEvent, IceConnectionState, Input, Output, Rtc,
};
use systemstat::{Platform, System};
use tokio::{net::UdpSocket, time::Sleep};
use yrs::updates::{decoder::Decode, encoder::Encode};

use super::signal::Signal;

pub struct PeerConnection {
    state: State,
    rtc: Rtc,
    timer: Pin<Box<Sleep>>,
    pending_incoming_signals: VecDeque<Signal>,
    pending_messages: VecDeque<Vec<u8>>,
}

#[derive(Debug)]
enum Negotiation {
    Initiator {
        socket: UdpSocket,
        pending_signals: VecDeque<Signal>,
        pending_offer: Option<SdpPendingOffer>,
        candidates: Vec<Candidate>,
    },
    Responder {
        socket: UdpSocket,
        pending_signals: VecDeque<Signal>,
        candidates: Vec<Candidate>,
    },
}

#[derive(Debug, PartialEq, Eq, Clone)]
pub enum NegotiationMode {
    Initiator,
    Responder,
}

enum State {
    Waiting {
        future: BoxFuture<'static, Result<UdpSocket, io::Error>>,
        mode: NegotiationMode,
    },
    Negotiating(Negotiation),
    Ready {
        socket: UdpSocket,
        channel: Option<ChannelId>,
    },
    Closed,
}

impl State {
    pub fn ready(socket: UdpSocket) -> Self {
        return State::Ready {
            socket,
            channel: None,
        };
    }

    pub fn negotiate(socket: UdpSocket, mode: NegotiationMode) -> Self {
        if mode == NegotiationMode::Initiator {
            return State::Negotiating(Negotiation::Initiator {
                socket,
                pending_signals: Default::default(),
                pending_offer: None,
                candidates: Default::default(),
            });
        } else {
            return State::Negotiating(Negotiation::Responder {
                socket,
                pending_signals: Default::default(),
                candidates: Default::default(),
            });
        }
    }
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
    Disconnect,
    Connected,
}

impl PeerConnection {
    pub fn connect(mode: NegotiationMode) -> Self {
        let rtc = Rtc::new();
        let socket = create_rtc_socket();

        Self {
            rtc,
            timer: Box::pin(tokio::time::sleep(Duration::default())),
            state: State::Waiting {
                future: socket.boxed(),
                mode,
            },
            pending_messages: Default::default(),
            pending_incoming_signals: Default::default(),
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

        self.pending_incoming_signals.push_back(signal);
    }

    fn remote_candidate(&mut self, candidate: Candidate) {
        log::debug!("add remote candidate");
        // TODO: race condition, remote candidate added after negotiate
        match &mut self.state {
            // State::Negotiating(Negotiation::Initiator { candidates, .. }) => {
            //     candidates.push(candidate);
            // }
            // State::Negotiating(Negotiation::Responder { candidates, .. }) => {
            //     candidates.push(candidate);
            // }
            _ => self.rtc.add_remote_candidate(candidate),
        }
    }

    pub fn send(&mut self, message: yrs::sync::Message) {
        log::debug!("sending message");
        self.pending_messages.push_back(message.encode_v1());
    }

    fn accept_answer(&mut self, answer: SdpAnswer) -> Result<(), PeerConnError> {
        log::debug!("accepting answer");
        match &mut self.state {
            State::Negotiating(Negotiation::Initiator {
                pending_offer,
                candidates,
                ..
            }) => {
                self.rtc
                    .sdp_api()
                    .accept_answer(pending_offer.take().ok_or(PeerConnError::SdpError)?, answer)
                    .map_err(|_| PeerConnError::SdpError)?;

                for candidate in candidates.drain(..) {
                    self.rtc.add_remote_candidate(candidate);
                }

                log::debug!("answer accepted");

                Ok(())
            }
            _ => Err(PeerConnError::SdpError),
        }
    }

    fn on_socket_ready(&mut self, socket: UdpSocket, mode: NegotiationMode) {
        log::debug!("socket ready");
        let addr = socket.local_addr().expect("a local socket adddress");
        let candidate = Candidate::host(addr, "udp").expect("a host candidate");
        self.rtc.add_local_candidate(candidate);

        log::debug!("negotiating, {mode:?}");
        self.change_state(|_| State::negotiate(socket, mode));
        self.start_negotiating()
    }

    fn start_negotiating(&mut self) {
        match &mut self.state {
            State::Negotiating(Negotiation::Initiator {
                pending_signals,
                pending_offer,
                ..
            }) => {
                // Active (AKA Initiator) path: https://github.com/algesten/str0m/tree/7170c3a3a5ef2d9446ac7193b5d2faa79e577a2a?tab=readme-ov-file#active
                // 1. Create an offer
                // 2. Send the offer to the remote peer
                // 3. Receive an answer from the remote peer
                // 4. Accept the answer
                // For creating SignalEvent::Signal event signal
                let mut sdp = self.rtc.sdp_api();
                sdp.add_channel("data".to_string());
                let (offer, pending) = sdp.apply().expect("Should create offer");

                pending_offer.replace(pending);
                // Emit offer via signal
                pending_signals.push_back(Signal::SdpOffer(offer));
            }
            _ => {}
        }
    }

    fn change_state<F>(&mut self, func: F)
    where
        F: FnOnce(State) -> State,
    {
        self.state = func(mem::replace(&mut self.state, State::Closed));
    }

    /// For consuming SignalEvent::Signal event signal
    fn accept_offer(&mut self, offer: SdpOffer) -> Result<(), PeerConnError> {
        log::debug!("accepting offer");
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

                log::debug!("offer accepted");

                Ok(())
            }
            _ => Err(PeerConnError::SdpError),
        }
    }

    fn on_connection_closed(&mut self) {
        log::debug!("connection closed");
        self.change_state(|_| State::Closed);
    }
    fn on_connection_opened(&mut self) {
        log::debug!("connection opened");
        self.change_state(|s| {
            if let State::Negotiating(Negotiation::Initiator { socket, .. })
            | State::Negotiating(Negotiation::Responder { socket, .. }) = s
            {
                State::ready(socket)
            } else {
                s
            }
        });
    }

    fn on_channel_opened(&mut self, channel_id: ChannelId, _name: String) {
        log::debug!("channel opened");
        self.change_state(|s| {
            if let State::Ready { channel, socket } = s {
                State::Ready {
                    channel: Some(channel_id),
                    socket,
                }
            } else {
                s
            }
        });
    }

    fn on_channel_closed(&mut self, channel_id: ChannelId) {
        log::debug!("channel closed");
        self.change_state(|s| {
            if let State::Ready { socket, .. } = s {
                State::Ready {
                    channel: None,
                    socket,
                }
            } else {
                s
            }
        });
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

    pub fn poll_output(&mut self, cx: &mut Context) -> Poll<Result<PeerConnEvent, PeerConnError>> {
        loop {
            {
                // 1. Get the socket
                let socket = match &mut self.state {
                    State::Negotiating(Negotiation::Initiator { socket, .. })
                    | State::Negotiating(Negotiation::Responder { socket, .. })
                    | State::Ready { socket, .. } => socket,
                    State::Waiting { future, mode } => {
                        return match future.poll_unpin(cx) {
                            Poll::Ready(Ok(socket)) => {
                                let m = mode.clone();
                                self.on_socket_ready(socket, m);
                                continue;
                            }
                            Poll::Pending => Poll::Pending,
                            Poll::Ready(Err(_)) => Poll::Ready(Err(PeerConnError::WebRtc)),
                        };
                    }
                    State::Closed => return Poll::Pending,
                };

                // 2. Work on the RTC connection
                //
                // Poll output until we get a timeout. The timeout means we are either awaiting UDP socket input
                // or the timeout to happen.
                let deadline = match self.rtc.poll_output() {
                    Ok(Output::Timeout(v)) => v,
                    Ok(Output::Transmit(v)) => {
                        return match socket.poll_send_to(cx, &v.contents, v.destination) {
                            Poll::Ready(Err(e)) => {
                                log::warn!("failed to send {}", e);
                                return Poll::Ready(Err(PeerConnError::WebRtc));
                            }
                            Poll::Ready(Ok(_)) => {
                                continue;
                            }
                            _ => Poll::Pending,
                        }
                    }
                    Ok(Output::Event(v)) => match v {
                        RTCEvent::IceConnectionStateChange(IceConnectionState::Disconnected) => {
                            // TODO: disconnect is not a full close
                            // Connection failed. This is a less stringent test than `failed` and may trigger
                            // intermittently and resolve just as spontaneously on less reliable networks,
                            // or during temporary disconnections. When the problem resolves, the connection
                            // may return to the connected state.
                            self.on_connection_closed();

                            cx.waker().wake_by_ref();
                            return Poll::Ready(Ok(PeerConnEvent::Disconnect));
                        }
                        RTCEvent::IceConnectionStateChange(IceConnectionState::Connected)
                        | RTCEvent::IceConnectionStateChange(IceConnectionState::Completed) => {
                            self.on_connection_opened();

                            continue;
                        }
                        RTCEvent::ChannelOpen(channel_id, name) => {
                            self.on_channel_opened(channel_id, name);

                            cx.waker().wake_by_ref();
                            return Poll::Ready(Ok(PeerConnEvent::Connected));
                        }
                        RTCEvent::ChannelClose(channel_id) => {
                            self.on_channel_closed(channel_id);

                            continue;
                        }
                        RTCEvent::ChannelData(info) => {
                            cx.waker().wake_by_ref();
                            return Poll::Ready(
                                self.on_inbound_data(info.id, info.data)
                                    .map(|message| PeerConnEvent::IncomingMessage(message)),
                            );
                        }
                        other => {
                            log::debug!("ignoring event: {:?}", other);
                            continue;
                        }
                    },
                    Err(e) => {
                        log::warn!("Failed to poll output: {:?}", e);
                        continue;
                    }
                };

                // 3. Wake up the timer
                self.timer.as_mut().reset(deadline.into());
                match self.timer.as_mut().poll(cx) {
                    Poll::Ready(_) => {
                        self.rtc
                            .handle_input(Input::Timeout(Instant::now()))
                            .expect("Failed to handle input");
                    }
                    Poll::Pending => {}
                }

                // 4. Poll the UDP socket for incoming data
                let mut recv_buf = [0u8; 2000];
                let mut buf = tokio::io::ReadBuf::new(&mut recv_buf);

                match socket.poll_recv_from(cx, &mut buf) {
                    Poll::Ready(Ok(source)) => {
                        let input = Input::Receive(
                            Instant::now(),
                            Receive {
                                proto: Protocol::Udp,
                                source,
                                destination: socket.local_addr().unwrap(),
                                contents: buf
                                    .filled()
                                    .try_into()
                                    .expect("Failed to convert buffer to slice"),
                            },
                        );

                        self.rtc
                            .handle_input(input)
                            .map_err(|_| PeerConnError::WebRtc)?;

                        continue;
                    }
                    Poll::Ready(Err(e)) => {
                        log::warn!("Failed to receive from socket: {}", e);
                    }
                    Poll::Pending => {}
                };
            }

            // 5. Flush any pending messages to go out
            match &mut self.state {
                State::Negotiating(Negotiation::Initiator {
                    pending_signals, ..
                })
                | State::Negotiating(Negotiation::Responder {
                    pending_signals, ..
                }) => {
                    if let Some(signal) = self.pending_incoming_signals.pop_front() {
                        match signal {
                            Signal::Renegotiate(renegotiate) if renegotiate => {
                                // TODO: not sure what this means
                                log::warn!("Renegotiate not implemented");
                                continue;
                            }
                            Signal::Candidate(candidate) => {
                                self.remote_candidate(candidate);
                                continue;
                            }
                            Signal::SdpAnswer(sdp) => {
                                if let Err(error) = self.accept_answer(sdp) {
                                    log::warn!("Failed to accept answer {:?}", error);
                                };
                                continue;
                            }
                            Signal::SdpOffer(sdp) => {
                                if let Err(error) = self.accept_offer(sdp) {
                                    log::warn!("Failed to accept offer {:?}", error);
                                };
                                continue;
                            }
                            _ => {}
                        }
                    }
                    if let Some(signal) = pending_signals.pop_front() {
                        cx.waker().wake_by_ref();
                        return Poll::Ready(Ok(PeerConnEvent::OutboundSignal(signal)));
                    }
                }
                State::Ready { channel, .. } => {
                    if let Some(id) = channel {
                        let id = id.clone();
                        if let Some(data) = self.pending_messages.pop_front() {
                            self.on_outbound_data(id, data)?;
                            continue;
                        }
                    }
                }
                _ => {
                    log::warn!("got some other state")
                }
            };

            return Poll::Pending;
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

async fn create_rtc_socket() -> io::Result<UdpSocket> {
    let addr = select_host_address();
    // TODO: switch to Tokio
    // Spin up a UDP socket for the RTC
    UdpSocket::bind(format!("{addr}:0")).await
}
