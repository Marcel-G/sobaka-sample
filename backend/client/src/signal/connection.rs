use std::{
    collections::VecDeque,
    fmt::Display,
    future, mem,
    task::{Context, Poll, Waker},
};

use futures::{future::BoxFuture, FutureExt, SinkExt, StreamExt};
use tokio::net::TcpStream;
use tokio_tungstenite::tungstenite::client::IntoClientRequest;
use tokio_tungstenite::tungstenite::http::StatusCode;
use tokio_tungstenite::tungstenite::protocol::Message as WsMessage;
use tokio_tungstenite::{MaybeTlsStream, WebSocketStream};
use url::Url;

use super::protocol::Message;

pub struct SignalConnection {
    options: SignalOptions,
    state: State,
    waker: Option<Waker>,
    pending_messages: VecDeque<String>,
}

pub struct SignalOptions {
    pub url: Url,
}
#[derive(Debug)]
pub enum SignalError {
    Client(StatusCode),
    Connecting,
}

#[derive(Debug)]
pub enum SignalEvent {
    IncomingMessage(Message),

    /// The connection was closed successfully.
    Closed,
}

impl SignalConnection {
    pub fn new_with_options(options: SignalOptions) -> Self {
        Self {
            options,
            state: State::Closed,
            waker: None,
            pending_messages: VecDeque::new(),
        }
    }

    pub fn connect(&mut self) {
        self.state = State::connect(self.options.url.clone());

        if let Some(waker) = self.waker.take() {
            waker.wake();
        }
    }

    /// Initiate a graceful close of the connection.
    pub fn close(&mut self) -> Result<(), SignalError> {
        log::info!("Closing signal connection");

        match mem::replace(&mut self.state, State::Closed) {
            State::Connecting(_) => return Err(SignalError::Connecting),
            State::Closing(stream) | State::Connected(stream) => {
                self.state = State::Closing(stream);
            }
            State::Closed => {}
        }

        Ok(())
    }

    /// Send a message to a topic.
    pub fn send(&mut self, message: Message) {
        self.pending_messages.push_back(
            message
                .to_json()
                .expect("message should always be serialize"),
        );
    }

    /// Sets the channels state to [`State::Connecting`] with the given error.
    fn reconnect_on_transient_error(&mut self, e: InternalError) {
        self.state = State::Connecting(future::ready(Err(e)).boxed())
    }

    pub fn poll(&mut self, cx: &mut Context) -> Poll<Result<SignalEvent, SignalError>> {
        loop {
            // First, check if we are connected.
            let stream = match &mut self.state {
                State::Closed => return Poll::Ready(Ok(SignalEvent::Closed)),
                State::Closing(stream) => match stream.poll_close_unpin(cx) {
                    Poll::Ready(Ok(())) => {
                        self.state = State::Closed;

                        return Poll::Ready(Ok(SignalEvent::Closed));
                    }
                    Poll::Ready(Err(_)) => {
                        return Poll::Ready(Ok(SignalEvent::Closed));
                    }
                    Poll::Pending => return Poll::Pending,
                },
                State::Connected(stream) => stream,
                State::Connecting(future) => match future.poll_unpin(cx) {
                    Poll::Ready(Ok(stream)) => {
                        self.state = State::Connected(stream);

                        continue;
                    }
                    Poll::Ready(Err(InternalError::WebSocket(
                        tokio_tungstenite::tungstenite::Error::Http(r),
                    ))) if r.status().is_client_error() => {
                        log::trace!("Failed to connect to signaling server: {r:?}");
                        return Poll::Ready(Err(SignalError::Client(r.status())));
                    }
                    Poll::Ready(Err(e)) => {
                        // Connection failed
                        // TODO: add exponential backoff and retry
                        //      https://github.com/firezone/firezone/blob/b8f5fb9e251a9e4efe0e04cbee62cb67de5b0cb6/rust/phoenix-channel/src/lib.rs#L394-L401
                        todo!("Failed to connect to signaling server: {e:?}");
                    }
                    Poll::Pending => {
                        // Save a waker in case we want to reset the `Connecting` state while we are waiting.
                        self.waker = Some(cx.waker().clone());

                        log::trace!("Waiting for connection");
                        return Poll::Pending;
                    }
                },
            };

            // Priority 1: Keep local buffers small and send pending messages.
            match stream.poll_ready_unpin(cx) {
                Poll::Ready(Ok(())) => {
                    if let Some(message) = self.pending_messages.pop_front() {
                        match stream.start_send_unpin(WsMessage::Text(message.clone())) {
                            Ok(()) => match stream.poll_flush_unpin(cx) {
                                Poll::Ready(Ok(())) => {}
                                Poll::Ready(Err(e)) => {
                                    self.reconnect_on_transient_error(InternalError::WebSocket(e));
                                    continue;
                                }
                                Poll::Pending => {}
                            },
                            Err(e) => {
                                self.pending_messages.push_front(message);
                                self.reconnect_on_transient_error(InternalError::WebSocket(e));
                            }
                        }
                        continue;
                    }
                }
                Poll::Ready(Err(e)) => {
                    log::trace!("Failed to send message {e:?}");
                    self.reconnect_on_transient_error(InternalError::WebSocket(e));
                    continue;
                }
                Poll::Pending => {}
            }

            // Priority 2: Handle incoming messages.
            match stream.poll_next_unpin(cx) {
                Poll::Ready(Some(Ok(message))) => {
                    let WsMessage::Text(message) = message else {
                        // Received non-text message
                        log::trace!("ignoring non-text message {message:?}");
                        continue;
                    };

                    log::trace!("handling incoming message {message:?}");

                    let message = match serde_json::from_str::<Message>(&message) {
                        Ok(m) => m,
                        // TODO: receving Ping([]) seems to trigger this case!
                        Err(e) if e.is_io() || e.is_eof() => {
                            self.reconnect_on_transient_error(InternalError::Serde(e));
                            continue;
                        }
                        Err(e) => {
                            // Failed to deserialize message
                            log::trace!("Parsing message failed {e:?}");
                            continue;
                        }
                    };

                    return Poll::Ready(Ok(SignalEvent::IncomingMessage(message)));
                }
                Poll::Ready(Some(Err(e))) => {
                    log::trace!("Stream closed {e:?}");
                    self.reconnect_on_transient_error(InternalError::WebSocket(e));
                    continue;
                }
                Poll::Ready(None) => {
                    log::trace!("Stream closed empty");
                    self.reconnect_on_transient_error(InternalError::StreamClosed);
                    continue;
                }
                Poll::Pending => {}
            }

            return Poll::Pending;
        }
    }
}

type SignalStream = WebSocketStream<MaybeTlsStream<TcpStream>>;

enum State {
    Connected(SignalStream),
    Connecting(BoxFuture<'static, Result<SignalStream, InternalError>>),
    Closing(SignalStream),
    Closed,
}

impl Display for State {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            State::Connected(_) => write!(f, "Connected"),
            State::Connecting(_) => write!(f, "Connecting"),
            State::Closing(_) => write!(f, "Closing"),
            State::Closed => write!(f, "Closed"),
        }
    }
}

impl State {
    fn connect(url: Url) -> Self {
        Self::Connecting(create_and_connect_websocket(url).boxed())
    }
}

async fn create_and_connect_websocket(url: Url) -> Result<SignalStream, InternalError> {
    let request = url
        .to_string()
        .into_client_request()
        .map_err(|_| InternalError::InvalidUrl)?;

    let (stream, _response) = tokio_tungstenite::connect_async(request)
        .await
        .map_err(InternalError::WebSocket)?;

    Ok(stream)
}

#[derive(Debug)]
enum InternalError {
    WebSocket(tokio_tungstenite::tungstenite::Error),
    Serde(serde_json::Error),
    CloseMessage,
    StreamClosed,
    InvalidUrl,
    SocketConnection(std::io::Error),
}
