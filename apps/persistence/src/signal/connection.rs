use cookie::Cookie;
use futures::{stream::SplitSink, stream::SplitStream, SinkExt, StreamExt};
use std::sync::Arc;
use std::time::Duration;
use tokio::net::TcpStream;
use tokio::sync::{mpsc, Mutex};
use tokio::task;
use tokio_tungstenite::tungstenite::client::IntoClientRequest;
use tokio_tungstenite::tungstenite::http::header::COOKIE;
use tokio_tungstenite::tungstenite::http::HeaderValue;
use tokio_tungstenite::tungstenite::Error as WsError;
use tokio_tungstenite::MaybeTlsStream;
use tokio_tungstenite::{tungstenite::protocol::Message as WsMessage, WebSocketStream};
use tracing::{debug, error, info, trace, warn};
use url::Url;

use super::protocol::Message;

/// Internal errors for WebSocket connection handling.
/// Fields are used via Debug derive for logging.
#[derive(Debug)]
#[allow(dead_code)]
pub enum InternalError {
    WebSocketError(Box<WsError>),
    ConnectionError(String),
    InvalidUrl,
}

impl From<WsError> for InternalError {
    fn from(err: WsError) -> Self {
        InternalError::WebSocketError(Box::new(err))
    }
}

type WebSocket = WebSocketStream<MaybeTlsStream<TcpStream>>;

pub struct WebSocketHandle {
    sender: mpsc::UnboundedSender<Message>,
    receiver: mpsc::UnboundedReceiver<Message>,
}

impl WebSocketHandle {
    pub fn send(&self, message: Message) -> Result<(), InternalError> {
        self.sender
            .send(message)
            .map_err(|_| InternalError::ConnectionError("Failed to send message".to_string()))
    }

    pub fn receiver(&mut self) -> &mut mpsc::UnboundedReceiver<Message> {
        &mut self.receiver
    }
}

pub fn websocket_client(url: Url, token: Option<String>) -> WebSocketHandle {
    let (tx_out, rx_out) = mpsc::unbounded_channel::<Message>();
    let (tx_in, rx_in) = mpsc::unbounded_channel::<Message>();

    let cloned_url = url.clone();
    let cloned_token = token.clone();

    let rx_out = Arc::new(Mutex::new(rx_out));

    info!(url = %url, "Starting WebSocket client");

    task::spawn(async move {
        let mut backoff = Duration::from_secs(1);
        let mut connection_attempts = 0u64;

        loop {
            connection_attempts += 1;

            debug!(
                url = %cloned_url,
                attempt = connection_attempts,
                "Attempting WebSocket connection"
            );

            match create_and_connect_websocket(cloned_url.clone(), cloned_token.clone()).await {
                Ok(ws_stream) => {
                    info!(
                        url = %cloned_url,
                        attempt = connection_attempts,
                        "Connected to signaling server"
                    );

                    // Reset backoff on successful connection
                    backoff = Duration::from_secs(1);

                    let (ws_sink, ws_stream) = ws_stream.split();
                    let rx_out_clone = Arc::clone(&rx_out);

                    let send_task = task::spawn(send_messages(ws_sink, rx_out_clone));
                    let receive_task = task::spawn(receive_messages(ws_stream, tx_in.clone()));

                    tokio::select! {
                        result = send_task => {
                            match result {
                                Ok(_) => info!("Send task completed normally"),
                                Err(e) => error!(error = ?e, "Send task panicked"),
                            }
                        }
                        result = receive_task => {
                            match result {
                                Ok(_) => info!("Receive task completed normally"),
                                Err(e) => error!(error = ?e, "Receive task panicked"),
                            }
                        }
                    }

                    warn!("WebSocket connection lost, will reconnect");
                }
                Err(err) => {
                    warn!(
                        url = %cloned_url,
                        attempt = connection_attempts,
                        error = ?err,
                        backoff_secs = backoff.as_secs(),
                        "Failed to connect to signaling server"
                    );
                    tokio::time::sleep(backoff).await;
                    backoff = std::cmp::min(backoff * 2, Duration::from_secs(32));
                }
            }
        }
    });

    WebSocketHandle {
        sender: tx_out,
        receiver: rx_in,
    }
}

async fn send_messages(
    mut ws_sink: SplitSink<WebSocket, WsMessage>,
    rx_out: Arc<Mutex<mpsc::UnboundedReceiver<Message>>>,
) {
    let mut rx_out = rx_out.lock().await;
    let mut messages_sent = 0u64;

    debug!("Send message loop started");

    loop {
        tokio::select! {
            Some(message) = rx_out.recv() => {
                let msg_type = match &message {
                    Message::Subscribe { .. } => "subscribe",
                    Message::Unsubscribe { .. } => "unsubscribe",
                    Message::Publish { .. } => "publish",
                    Message::Ping => "ping",
                    Message::Pong => "pong",
                };

                trace!(message_type = msg_type, "Sending message");

                match serde_json::to_string(&message) {
                    Ok(json) => {
                        if let Err(err) = ws_sink.send(WsMessage::Text(json)).await {
                            error!(error = ?err, "Failed to send message");
                            break;
                        }
                        messages_sent += 1;
                    }
                    Err(err) => {
                        error!(error = ?err, "Failed to serialize message");
                    }
                }
            }
            else => {
                debug!("Message channel closed");
                break;
            }
        }
    }

    info!(messages_sent = messages_sent, "Send loop terminated");
}

async fn receive_messages(
    mut ws_stream: SplitStream<WebSocket>,
    tx_in: mpsc::UnboundedSender<Message>,
) {
    let mut messages_received = 0u64;

    debug!("Receive message loop started");

    while let Some(msg) = ws_stream.next().await {
        match msg {
            Ok(WsMessage::Text(json)) => match serde_json::from_str::<Message>(&json) {
                Ok(message) => {
                    trace!(message = ?message, "Received message");
                    messages_received += 1;

                    if tx_in.send(message).is_err() {
                        warn!("Message receiver dropped, stopping receive task");
                        break;
                    }
                }
                Err(err) => {
                    warn!(
                        error = ?err,
                        json_len = json.len(),
                        json_preview = %json.chars().take(500).collect::<String>(),
                        "Failed to parse received message"
                    );
                }
            },
            Ok(WsMessage::Ping(data)) => {
                trace!(data_len = data.len(), "Received WebSocket ping");
                // tokio-tungstenite handles pong automatically
            }
            Ok(WsMessage::Pong(_)) => {
                trace!("Received WebSocket pong");
            }
            Ok(WsMessage::Close(frame)) => {
                info!(close_frame = ?frame, "WebSocket connection closed by server");
                break;
            }
            Ok(WsMessage::Binary(data)) => {
                debug!(bytes = data.len(), "Ignoring binary message");
            }
            Ok(WsMessage::Frame(_)) => {
                trace!("Ignoring raw frame");
            }
            Err(err) => {
                error!(error = ?err, "WebSocket error");
                break;
            }
        }
    }

    info!(
        messages_received = messages_received,
        "Receive loop terminated"
    );
}

async fn create_and_connect_websocket(
    url: Url,
    token: Option<String>,
) -> Result<WebSocket, InternalError> {
    debug!(url = %url, has_token = token.is_some(), "Creating WebSocket connection");

    let mut request = url.to_string().into_client_request().map_err(|e| {
        error!(error = ?e, "Failed to create client request");
        InternalError::InvalidUrl
    })?;

    if let Some(token) = token {
        trace!("Adding JWT cookie to request");
        request.headers_mut().insert(
            COOKIE,
            HeaderValue::from_str(&format!("jwt={}; HttpOnly; Path=/", token)).map_err(|e| {
                error!(error = ?e, "Failed to create cookie header");
                InternalError::InvalidUrl
            })?,
        );
    }

    let (stream, response) = tokio_tungstenite::connect_async(request)
        .await
        .map_err(|e| {
            error!(error = ?e, "WebSocket connection failed");
            InternalError::ConnectionError(e.to_string())
        })?;

    debug!(
        status = %response.status(),
        "WebSocket handshake completed"
    );

    // Log any cookies received
    let cookies: Vec<Cookie> = response
        .headers()
        .get_all("set-cookie")
        .iter()
        .filter_map(|header_value| header_value.to_str().ok())
        .flat_map(|set_cookie| Cookie::parse(set_cookie).ok())
        .collect();

    for cookie in &cookies {
        if cookie.name() == "jwt" {
            debug!(
                cookie_name = cookie.name(),
                "Received JWT cookie from server"
            );
        }
    }

    Ok(stream)
}
