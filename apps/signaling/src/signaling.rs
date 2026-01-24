use futures_util::stream::SplitSink;
use futures_util::{SinkExt, StreamExt};
use std::collections::{HashMap, HashSet};
use std::hash::{Hash, Hasher};
use std::sync::Arc;
use std::time::Duration;
use tokio::select;
use tokio::sync::{Mutex, RwLock};
use tokio::time::interval;
use tracing::{debug, error, info, trace, warn};
use warp::ws::{Message, WebSocket};
use warp::Error;

use crate::jwt::Token;
use crate::protocol::{Message as Signal, MessageData, PeerKind};

const PING_TIMEOUT: Duration = Duration::from_secs(30);

/// Metrics for monitoring the signaling service health.
#[derive(Debug, Default)]
struct Metrics {
    total_connections: std::sync::atomic::AtomicU64,
    active_connections: std::sync::atomic::AtomicU64,
    messages_published: std::sync::atomic::AtomicU64,
    messages_failed: std::sync::atomic::AtomicU64,
}

/// Signaling service is used by y-webrtc protocol in order to exchange WebRTC offerings between
/// clients subscribing to particular rooms.
#[derive(Debug, Clone)]
pub struct SignalingService {
    topics: Topics,
    workers: Workers,
    metrics: Arc<Metrics>,
}

impl SignalingService {
    pub fn new() -> Self {
        info!("Initializing signaling service");
        SignalingService {
            topics: Arc::new(RwLock::new(Default::default())),
            workers: Arc::new(RwLock::new(Default::default())),
            metrics: Arc::new(Metrics::default()),
        }
    }

    /// Get current service statistics for monitoring.
    pub async fn stats(&self) -> (usize, usize) {
        let topics = self.topics.read().await;
        let workers = self.workers.read().await;
        (topics.len(), workers.len())
    }

    pub async fn publish(&self, topic: &str, msg: Message) -> Result<(), Error> {
        let mut failed = Vec::new();
        {
            let topics = self.topics.read().await;
            if let Some(subs) = topics.get(topic) {
                let client_count = subs.len();
                debug!(
                    topic = %topic,
                    subscriber_count = client_count,
                    "Publishing message to subscribers"
                );

                for sub in subs {
                    if let Err(e) = sub.try_send(msg.clone()).await {
                        warn!(
                            topic = %topic,
                            error = %e,
                            "Failed to send message to subscriber"
                        );
                        self.metrics.messages_failed.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
                        failed.push(sub.clone());
                    }
                }

                self.metrics.messages_published.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
            }
        }

        if !failed.is_empty() {
            let mut topics = self.topics.write().await;
            if let Some(subs) = topics.get_mut(topic) {
                let removed_count = failed.len();
                for f in failed {
                    subs.remove(&f);
                }
                warn!(
                    topic = %topic,
                    removed_count = removed_count,
                    "Removed failed subscribers from topic"
                );
            }
        }

        Ok(())
    }

    pub async fn close_topic(&self, topic: &str) -> Result<(), Error> {
        let mut topics = self.topics.write().await;
        if let Some(subs) = topics.remove(topic) {
            let sub_count = subs.len();
            info!(
                topic = %topic,
                subscriber_count = sub_count,
                "Closing topic and disconnecting all subscribers"
            );

            for sub in subs {
                if let Err(e) = sub.close().await {
                    warn!(
                        topic = %topic,
                        error = %e,
                        "Failed to close subscriber connection"
                    );
                }
            }
        }
        Ok(())
    }

    pub async fn close(self) -> Result<(), Error> {
        info!("Shutting down signaling service");

        let mut topics = self.topics.write_owned().await;
        let mut all_conns = HashSet::new();
        for (_, subs) in topics.drain() {
            for sub in subs {
                all_conns.insert(sub);
            }
        }

        let conn_count = all_conns.len();
        info!(connection_count = conn_count, "Closing all connections");

        for conn in all_conns {
            if let Err(e) = conn.close().await {
                warn!(error = %e, "Failed to close connection during shutdown");
            }
        }

        info!("Signaling service shutdown complete");
        Ok(())
    }
}

impl Default for SignalingService {
    fn default() -> Self {
        Self::new()
    }
}

type Topics = Arc<RwLock<HashMap<String, HashSet<WsSink>>>>;
type Workers = Arc<RwLock<HashSet<WsSink>>>;

#[derive(Debug, Clone)]
struct WsSink(Arc<Mutex<SplitSink<WebSocket, Message>>>);

impl WsSink {
    fn new(sink: SplitSink<WebSocket, Message>) -> Self {
        WsSink(Arc::new(Mutex::new(sink)))
    }

    async fn try_send(&self, msg: Message) -> Result<(), Error> {
        let mut sink = self.0.lock().await;
        if let Err(e) = sink.send(msg).await {
            sink.close().await?;
            Err(e)
        } else {
            Ok(())
        }
    }

    async fn close(&self) -> Result<(), Error> {
        let mut sink = self.0.lock().await;
        sink.close().await
    }
}

impl Hash for WsSink {
    fn hash<H: Hasher>(&self, state: &mut H) {
        let ptr = Arc::as_ptr(&self.0) as usize;
        ptr.hash(state);
    }
}

impl PartialEq<Self> for WsSink {
    fn eq(&self, other: &Self) -> bool {
        Arc::ptr_eq(&self.0, &other.0)
    }
}

impl Eq for WsSink {}

/// Handle incoming signaling connection - it's a websocket connection used by y-webrtc protocol
/// to exchange offering metadata between y-webrtc peers. It also manages topic/room access.
pub async fn signaling_conn(
    ws: WebSocket,
    service: SignalingService,
    token: Token,
) -> Result<(), Error> {
    let mut topics: Topics = service.topics;
    let mut workers: Workers = service.workers;
    let (sink, mut stream) = ws.split();
    let ws = WsSink::new(sink);
    let mut ping_interval = interval(PING_TIMEOUT);
    let mut state = ConnState::new(token);

    // Track connection in metrics
    service.metrics.total_connections.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
    service.metrics.active_connections.fetch_add(1, std::sync::atomic::Ordering::Relaxed);

    match state.token.kind {
        PeerKind::Worker => {
            workers.write().await.insert(ws.clone());
            info!(
                uuid = %state.token.uuid,
                "Worker peer registered"
            );
        }
        PeerKind::Client => {
            debug!(
                uuid = %state.token.uuid,
                "Client peer connected"
            );
        }
    }

    let result = loop {
        select! {
            _ = ping_interval.tick() => {
                if !state.pong_received {
                    warn!(
                        uuid = %state.token.uuid,
                        "Ping timeout - closing connection"
                    );
                    break Ok(());
                } else {
                    state.pong_received = false;
                    trace!(uuid = %state.token.uuid, "Sending ping");
                    if let Err(e) = ws.try_send(Message::ping(Vec::default())).await {
                        error!(
                            uuid = %state.token.uuid,
                            error = %e,
                            "Failed to send ping"
                        );
                        break Err(e);
                    }
                }
            },
            res = stream.next() => {
                match res {
                    None => {
                        debug!(uuid = %state.token.uuid, "Stream ended");
                        break Ok(());
                    },
                    Some(Err(e)) => {
                        error!(
                            uuid = %state.token.uuid,
                            error = %e,
                            "WebSocket error"
                        );
                        break Err(e);
                    },
                    Some(Ok(msg)) if msg.is_text() => {
                        let json = msg.to_str().unwrap();
                        if let Err(e) = process_msg(json, &ws, &mut state, &mut topics, &mut workers).await {
                            error!(
                                uuid = %state.token.uuid,
                                error = %e,
                                "Failed to process message"
                            );
                            break Err(e);
                        }
                    },
                    Some(Ok(msg)) if msg.is_close() => {
                        info!(
                            uuid = %state.token.uuid,
                            subscribed_topics = state.subscribed_topics.len(),
                            "Client initiated close"
                        );
                        cleanup_subscriptions(&ws, &mut state, &mut topics).await;
                        state.closed = true;
                        break Ok(());
                    },
                    Some(Ok(msg)) if msg.is_pong() => {
                        trace!(uuid = %state.token.uuid, "Received pong");
                        state.pong_received = true;
                    },
                    Some(Ok(msg)) if msg.is_ping() => {
                        trace!(uuid = %state.token.uuid, "Received ping, sending pong");
                        if let Err(e) = ws.try_send(Message::pong(Vec::default())).await {
                            warn!(
                                uuid = %state.token.uuid,
                                error = %e,
                                "Failed to send pong"
                            );
                        }
                    },
                    _ => {}
                }
            }
        }
    };

    // Cleanup on exit
    if !state.closed {
        cleanup_subscriptions(&ws, &mut state, &mut topics).await;
    }

    // Cleanup worker registration
    if matches!(state.token.kind, PeerKind::Worker) {
        workers.write().await.remove(&ws);
        info!(uuid = %state.token.uuid, "Worker peer unregistered");
    }

    // Update metrics
    service.metrics.active_connections.fetch_sub(1, std::sync::atomic::Ordering::Relaxed);

    let _ = ws.close().await;
    result
}

/// Clean up topic subscriptions when a peer disconnects.
async fn cleanup_subscriptions(ws: &WsSink, state: &mut ConnState, topics: &mut Topics) {
    let mut topics_guard = topics.write().await;
    let topic_count = state.subscribed_topics.len();

    for topic in state.subscribed_topics.drain() {
        if let Some(subs) = topics_guard.get_mut(&topic) {
            subs.remove(ws);
            if subs.is_empty() {
                topics_guard.remove(&topic);
                debug!(topic = %topic, "Topic removed (no subscribers)");
            }
        }
    }

    if topic_count > 0 {
        debug!(
            topic_count = topic_count,
            "Cleaned up topic subscriptions"
        );
    }
}

const PONG_MSG: &str = r#"{"type":"pong"}"#;

async fn process_msg(
    msg: &str,
    ws: &WsSink,
    state: &mut ConnState,
    topics: &mut Topics,
    workers: &mut Workers,
) -> Result<(), Error> {
    let signal: Signal = match serde_json::from_str(msg) {
        Ok(s) => s,
        Err(e) => {
            warn!(
                uuid = %state.token.uuid,
                error = %e,
                message_preview = %msg.chars().take(100).collect::<String>(),
                "Failed to parse signaling message"
            );
            return Ok(()); // Don't disconnect on parse errors
        }
    };

    match signal {
        Signal::Subscribe { topics: topic_names } => {
            if topic_names.is_empty() {
                return Ok(());
            }

            let topic_count = topic_names.len();
            debug!(
                uuid = %state.token.uuid,
                topic_count = topic_count,
                topics = ?topic_names,
                "Subscribe request"
            );

            let mut topics_guard = topics.write().await;
            for topic in topic_names {
                if let Some((key, _)) = topics_guard.get_key_value(&topic) {
                    state.subscribed_topics.insert(key.clone());
                    let subs = topics_guard.get_mut(&topic).unwrap();
                    let sub_count = subs.len();
                    subs.insert(ws.clone());
                    trace!(
                        topic = %topic,
                        existing_subscribers = sub_count,
                        "Client joined existing topic"
                    );
                } else {
                    state.subscribed_topics.insert(topic.clone());
                    let mut subs = HashSet::new();
                    subs.insert(ws.clone());
                    topics_guard.insert(topic.clone(), subs);
                    info!(
                        topic = %topic,
                        uuid = %state.token.uuid,
                        "New topic created"
                    );
                };
            }
        }

        Signal::Unsubscribe { topics: topic_names } => {
            if topic_names.is_empty() {
                return Ok(());
            }

            debug!(
                uuid = %state.token.uuid,
                topics = ?topic_names,
                "Unsubscribe request"
            );

            let mut topics_guard = topics.write().await;
            for topic in topic_names {
                if let Some(subs) = topics_guard.get_mut(&topic) {
                    subs.remove(ws);
                    state.subscribed_topics.remove(&topic);

                    if subs.is_empty() {
                        topics_guard.remove(&topic);
                        debug!(topic = %topic, "Topic removed (no subscribers)");
                    }
                }
            }
        }

        Signal::Publish { topic, data, .. } => {
            let mut failed = Vec::new();
            let msg_type = match &data {
                MessageData::Announce { .. } => "announce",
                MessageData::Signal { .. } => "signal",
            };

            trace!(
                uuid = %state.token.uuid,
                topic = %topic,
                message_type = msg_type,
                "Processing publish"
            );

            {
                let topics_guard = topics.read().await;
                if let Some(receivers) = topics_guard.get(&topic) {
                    let client_count = receivers.len();

                    let out_msg = Signal::Publish {
                        topic: topic.clone(),
                        identity: Some(state.token.uuid.clone()),
                        kind: Some(state.token.kind.clone()),
                        data: data.clone(),
                    };

                    let out_json = match out_msg.to_json() {
                        Ok(j) => j,
                        Err(e) => {
                            error!(error = %e, "Failed to serialize outgoing message");
                            return Ok(());
                        }
                    };

                    // Notify workers about announce messages from clients
                    if matches!(state.token.kind, PeerKind::Client) {
                        if let MessageData::Announce { .. } = data {
                            let workers_guard = workers.read().await;
                            let worker_count = workers_guard.len();

                            if worker_count > 0 {
                                debug!(
                                    topic = %topic,
                                    worker_count = worker_count,
                                    "Broadcasting announce to workers"
                                );
                            }

                            for receiver in workers_guard.iter() {
                                if let Err(e) = receiver
                                    .try_send(Message::text(&out_json))
                                    .await
                                {
                                    warn!(
                                        topic = %topic,
                                        error = %e,
                                        "Failed to notify worker"
                                    );
                                    failed.push(receiver.clone());
                                }
                            }
                        }
                    }

                    // Send to all subscribers
                    trace!(
                        topic = %topic,
                        subscriber_count = client_count,
                        "Broadcasting to subscribers"
                    );

                    for receiver in receivers.iter() {
                        if let Err(e) = receiver
                            .try_send(Message::text(&out_json))
                            .await
                        {
                            warn!(
                                topic = %topic,
                                error = %e,
                                "Failed to send to subscriber"
                            );
                            failed.push(receiver.clone());
                        }
                    }
                }
            }

            if !failed.is_empty() {
                let failed_count = failed.len();
                let mut topics_guard = topics.write().await;
                if let Some(receivers) = topics_guard.get_mut(&topic) {
                    for f in failed {
                        receivers.remove(&f);
                    }
                }
                warn!(
                    topic = %topic,
                    failed_count = failed_count,
                    "Removed failed subscribers"
                );
            }
        }

        Signal::Ping => {
            trace!(uuid = %state.token.uuid, "Received application-level ping");
            ws.try_send(Message::text(PONG_MSG)).await?;
        }

        Signal::Pong => {
            trace!(uuid = %state.token.uuid, "Received application-level pong");
        }
    }

    Ok(())
}

#[derive(Debug)]
struct ConnState {
    closed: bool,
    token: Token,
    pong_received: bool,
    subscribed_topics: HashSet<String>,
}

impl ConnState {
    fn new(token: Token) -> Self {
        ConnState {
            token,
            closed: false,
            pong_received: true,
            subscribed_topics: HashSet::new(),
        }
    }
}
