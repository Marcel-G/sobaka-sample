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
use url::Url;

use super::protocol::Message;

#[derive(Debug)]
pub enum InternalError {
    WebSocketError(WsError),
    ConnectionError(String),
    InvalidUrl,
}

impl From<WsError> for InternalError {
    fn from(err: WsError) -> Self {
        InternalError::WebSocketError(err)
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

    task::spawn(async move {
        let mut backoff = Duration::from_secs(1);

        loop {
            match create_and_connect_websocket(cloned_url.clone(), cloned_token.clone()).await {
                Ok(ws_stream) => {
                    log::info!("Connected to WebSocket server");

                    let (ws_sink, ws_stream) = ws_stream.split();
                    let rx_out_clone = Arc::clone(&rx_out);

                    let send_task = task::spawn(send_messages(ws_sink, rx_out_clone));
                    let receive_task = task::spawn(receive_messages(ws_stream, tx_in.clone()));

                    tokio::select! {
                        _ = send_task => log::info!("Send task completed"),
                        _ = receive_task => log::info!("Receive task completed"),
                    }
                }
                Err(err) => {
                    log::info!("Failed to connect: {:?}, retrying in {:?}", err, backoff);
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
    loop {
        tokio::select! {
            Some(message) = rx_out.recv() => {
                log::debug!("Sending message: {:?}", message);
                match serde_json::to_string(&message) {
                    Ok(json) => {
                        if let Err(err) = ws_sink.send(WsMessage::Text(json)).await {
                            log::info!("Failed to send message: {:?}", err);
                            break;
                        }
                    }
                    Err(err) => {
                        log::info!("Failed to serialize message: {:?}", err);
                    }
                }
            }
            else => break,
        }
    }
}

async fn receive_messages(
    mut ws_stream: SplitStream<WebSocket>,
    tx_in: mpsc::UnboundedSender<Message>,
) {
    while let Some(msg) = ws_stream.next().await {
        match msg {
            Ok(WsMessage::Text(json)) => match serde_json::from_str::<Message>(&json) {
                Ok(message) => {
                    log::debug!("Received message: {:?}", message);
                    if tx_in.send(message).is_err() {
                        log::info!("Receiver dropped, stopping receive task");
                        break;
                    }
                }
                Err(err) => {
                    log::info!("Invalid message received: {:?}", err);
                }
            },
            Ok(WsMessage::Close(_)) => {
                log::info!("WebSocket connection closed");
                break;
            }
            Err(err) => {
                log::info!("WebSocket error: {:?}", err);
                break;
            }
            _ => {}
        }
    }
}

async fn create_and_connect_websocket(
    url: Url,
    token: Option<String>,
) -> Result<WebSocket, InternalError> {
    let mut request = url
        .to_string()
        .into_client_request()
        .map_err(|_| InternalError::InvalidUrl)?;

    if let Some(token) = token {
        request.headers_mut().insert(
            COOKIE,
            HeaderValue::from_str(&format!("jwt={}; HttpOnly; Path=/", token))
                .map_err(|_| InternalError::InvalidUrl)?,
        );
    }

    let (stream, response) = tokio_tungstenite::connect_async(request)
        .await
        .map_err(|e| InternalError::ConnectionError(e.to_string()))?;

    let cookies = response
        .headers()
        .get_all("set-cookie")
        .iter()
        .filter_map(|header_value| header_value.to_str().ok())
        .flat_map(|set_cookie| Cookie::parse(set_cookie).ok())
        .collect::<Vec<Cookie>>();

    for cookie in cookies {
        log::info!("Cookie Name: {}, Value: {}", cookie.name(), cookie.value());
    }

    Ok(stream)
}
