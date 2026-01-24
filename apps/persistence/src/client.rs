use std::{
    collections::{HashMap, VecDeque},
    io::ErrorKind,
    net::UdpSocket,
    sync::Arc,
    time::{Duration, Instant},
};

use serde_json::Value;
use str0m::{
    net::{Protocol, Receive},
    Candidate, Input,
};
use tracing::{debug, error, info, trace, warn};
use yrs::{uuid_v4, Uuid};

use crate::{
    peer::connection::{PeerConnection, Propagated},
    signal::{
        connection::WebSocketHandle,
        protocol::{Message, MessageData},
    },
    workspace::{Db, Workspace},
};

/// Statistics for monitoring the persistence client.
#[derive(Debug, Default)]
struct Stats {
    connections_total: u64,
    connections_active: u64,
    workspaces_active: u64,
    messages_received: u64,
    messages_sent: u64,
}

pub struct Client {
    buf: Vec<u8>,
    candidate: Candidate,
    connections: Vec<PeerConnection>,
    db: Arc<Db>,
    peer_id: Uuid,
    socket: UdpSocket,
    to_propagate: VecDeque<(String, Propagated)>,
    workspaces: HashMap<String, Workspace>,
    ws_handle: WebSocketHandle,
    stats: Stats,
    last_stats_log: Instant,
}

impl Client {
    pub fn new(socket: UdpSocket, candidate: Candidate, ws_handle: WebSocketHandle) -> Self {
        let peer_id = uuid_v4();
        info!(
            peer_id = %peer_id,
            "Persistence client initialized"
        );

        Self {
            candidate,
            buf: vec![0; 2000],
            connections: Vec::new(),
            db: Arc::new(Db::new()),
            peer_id,
            socket,
            to_propagate: VecDeque::new(),
            workspaces: HashMap::new(),
            ws_handle,
            stats: Stats::default(),
            last_stats_log: Instant::now(),
        }
    }

    /// Log periodic statistics about the client state.
    fn log_stats_if_needed(&mut self) {
        const STATS_INTERVAL: Duration = Duration::from_secs(60);

        if self.last_stats_log.elapsed() >= STATS_INTERVAL {
            self.stats.connections_active = self.connections.len() as u64;
            self.stats.workspaces_active = self.workspaces.len() as u64;

            info!(
                connections_total = self.stats.connections_total,
                connections_active = self.stats.connections_active,
                workspaces_active = self.stats.workspaces_active,
                messages_received = self.stats.messages_received,
                messages_sent = self.stats.messages_sent,
                "Persistence client statistics"
            );

            self.last_stats_log = Instant::now();
        }
    }

    fn handle_incoming_signal(
        &mut self,
        topic: String,
        identity: String,
        from: String,
        to: String,
        signal: Value,
    ) {
        let parsed_signal = match serde_json::from_value(signal.clone()) {
            Ok(s) => s,
            Err(e) => {
                // mDNS signals are not supported by Candidate, if one is received, ignore it.
                debug!(
                    error = %e,
                    signal_preview = %signal.to_string().chars().take(100).collect::<String>(),
                    "Ignoring unparseable signal (likely mDNS)"
                );
                return;
            }
        };

        if to != self.peer_id.to_string() {
            debug!(
                to = %to,
                from = %from,
                peer_id = %self.peer_id,
                topic = %topic,
                "Signal not addressed to us, ignoring"
            );
            return;
        }

        debug!(
            from = %from,
            to = %to,
            topic = %topic,
            "Processing incoming signal addressed to us"
        );

        self.stats.messages_received += 1;

        // Get or create the peer connection
        // We reuse existing connections to the same client, just adding new topics
        if let Some(connection) = self
            .connections
            .iter_mut()
            .find(|con| con.client_id() == from)
        {
            // Add topic to existing connection if not already present
            if !connection.has_topic(&topic) {
                debug!(
                    client_id = %from,
                    topic = %topic,
                    "Adding topic to existing peer connection"
                );
                connection.add_topic(topic.clone());
            }

            trace!(
                client_id = %from,
                topic = %topic,
                "Forwarding signal to existing connection"
            );
            connection.handle_signal(parsed_signal)
        } else {
            info!(
                client_id = %from,
                identity = %identity,
                topic = %topic,
                "Creating new peer connection"
            );

            self.stats.connections_total += 1;

            let mut connection =
                PeerConnection::new(self.candidate.clone(), identity.clone(), from.clone());
            connection.add_topic(topic.clone());
            connection.handle_signal(parsed_signal);
            self.connections.push(connection);
        }
    }

    fn handle_outgoing_signal(&mut self, topic: String, to: String, signal: Value) {
        let from = self.peer_id.to_string();

        trace!(
            topic = %topic,
            to = %to,
            "Sending outgoing signal"
        );

        let message = Message::Publish {
            topic,
            identity: None,
            kind: None,
            data: MessageData::Signal { from, to, signal },
        };

        if let Err(e) = self.ws_handle.send(message) {
            error!(error = ?e, "Failed to send outgoing signal");
        } else {
            self.stats.messages_sent += 1;
        }
    }

    pub fn join_topic(&mut self, topic: String) {
        info!(
            topic = %topic,
            peer_id = %self.peer_id,
            "Joining topic and announcing presence"
        );

        let subscribe = Message::Subscribe {
            topics: [topic.clone()].to_vec(),
        };

        if let Err(e) = self.ws_handle.send(subscribe) {
            error!(topic = %topic, error = ?e, "Failed to send subscribe message");
            return;
        }

        debug!(topic = %topic, "Subscribe message sent");

        if !self.workspaces.contains_key(&topic) {
            debug!(topic = %topic, "Creating new workspace");
            let workspace = Workspace::new(&topic, self.db.clone());
            self.workspaces.insert(topic.clone(), workspace);
        }

        let announce = Message::Publish {
            topic: topic.clone(),
            identity: None,
            kind: None,
            data: MessageData::Announce {
                from: self.peer_id.to_string(),
            },
        };

        if let Err(e) = self.ws_handle.send(announce) {
            error!(topic = %topic, error = ?e, "Failed to send announce message");
        } else {
            debug!(
                topic = %topic,
                peer_id = %self.peer_id,
                "Announce message sent"
            );
        }
    }

    fn handle_peer_discovered(&mut self, topic: String, from: String) {
        if from == self.peer_id.to_string() {
            trace!("Ignoring self-discovery");
            return;
        }

        debug!(
            topic = %topic,
            from = %from,
            "Peer discovered, joining topic"
        );

        self.join_topic(topic);
    }

    pub fn run(&mut self) {
        loop {
            // Periodic statistics logging
            self.log_stats_if_needed();

            // Cleanup dead connections
            let before_count = self.connections.len();
            self.connections.retain(|conn| conn.is_alive());
            let removed = before_count - self.connections.len();
            if removed > 0 {
                debug!(
                    removed_count = removed,
                    remaining = self.connections.len(),
                    "Cleaned up dead connections"
                );
            }

            // Process signaling messages
            match self.ws_handle.receiver().try_recv().ok() {
                Some(Message::Publish {
                    topic,
                    data,
                    identity,
                    kind,
                }) => {
                    debug!(
                        topic = %topic,
                        has_identity = identity.is_some(),
                        kind = ?kind,
                        data_type = %match &data {
                            MessageData::Announce { .. } => "announce",
                            MessageData::Signal { .. } => "signal",
                        },
                        "Received publish message"
                    );

                    match data {
                        MessageData::Announce { from } if identity.is_some() => {
                            self.handle_peer_discovered(topic, from);
                            continue;
                        }
                        MessageData::Signal { from, to, signal } if identity.is_some() => {
                            self.handle_incoming_signal(
                                topic,
                                identity.expect("valid identity"),
                                from,
                                to,
                                signal,
                            );
                            continue;
                        }
                        MessageData::Announce { from } => {
                            debug!(
                                topic = %topic,
                                from = %from,
                                "Ignoring announce without identity (likely our own)"
                            );
                        }
                        MessageData::Signal { from, to, .. } => {
                            warn!(
                                topic = %topic,
                                from = %from,
                                to = %to,
                                "Ignoring signal without identity - this may indicate a problem"
                            );
                        }
                    }
                }
                Some(other) => {
                    debug!(message = ?other, "Received non-publish message");
                }
                None => {}
            }

            // Poll connections until they return timeout
            let mut timeout = Instant::now() + Duration::from_millis(100);
            for connection in self.connections.iter_mut() {
                let t = poll_until_timeout(connection, &mut self.to_propagate, &self.socket);
                timeout = timeout.min(t);
            }

            // Process propagated events
            if let Some(p) = self.to_propagate.pop_front() {
                match p {
                    (client_id, Propagated::Data(topic, data)) => {
                        trace!(
                            client_id = %client_id,
                            topic = %topic,
                            data_len = data.len(),
                            "Processing data from peer"
                        );

                        if let Some(workspace) = self.workspaces.get_mut(&topic) {
                            if let Some(client) = self
                                .connections
                                .iter_mut()
                                .find(|c| c.client_id() == client_id)
                            {
                                workspace.handle_input(&data, client);
                            } else {
                                warn!(
                                    client_id = %client_id,
                                    topic = %topic,
                                    "Client not found for data propagation"
                                );
                            }
                        } else {
                            warn!(
                                topic = %topic,
                                "Workspace not found for data propagation"
                            );
                        }
                    }
                    (client_id, Propagated::Signal(topic, signal)) => {
                        match serde_json::to_value(signal) {
                            Ok(value) => {
                                self.handle_outgoing_signal(topic, client_id, value);
                            }
                            Err(e) => {
                                error!(error = %e, "Failed to serialize outgoing signal");
                            }
                        }
                    }
                    (client_id, Propagated::Connected(topic)) => {
                        info!(
                            client_id = %client_id,
                            topic = %topic,
                            "Peer connected via WebRTC"
                        );

                        if let Some(workspace) = self.workspaces.get_mut(&topic) {
                            if let Some(client) = self
                                .connections
                                .iter_mut()
                                .find(|c| c.client_id() == client_id)
                            {
                                workspace.handle_connection(client);
                            } else {
                                warn!(
                                    client_id = %client_id,
                                    "Client not found for connection handling"
                                );
                            }
                        } else {
                            warn!(
                                topic = %topic,
                                "Workspace not found for connection handling"
                            );
                        }
                    }
                    _ => {}
                }
                continue;
            }

            // Set socket read timeout
            let duration = (timeout - Instant::now()).max(Duration::from_millis(1));
            if let Err(e) = self.socket.set_read_timeout(Some(duration)) {
                error!(error = %e, "Failed to set socket read timeout");
            }

            // Read from socket
            if let Some(input) = read_socket_input(&self.socket, &self.candidate, &mut self.buf) {
                if let Some(client) = self.connections.iter_mut().find(|c| c.accepts(&input)) {
                    client.handle_input(input);
                } else {
                    // This is common - we may receive STUN before the connection is ready
                    trace!("No client accepts UDP input (connection not ready)");
                }
            }

            // Drive time forward in all clients
            let now = Instant::now();
            for connection in &mut self.connections {
                connection.handle_input(Input::Timeout(now));
            }
        }
    }
}

fn read_socket_input<'a>(
    socket: &UdpSocket,
    candidate: &Candidate,
    buf: &'a mut Vec<u8>,
) -> Option<Input<'a>> {
    buf.resize(2000, 0);

    match socket.recv_from(buf) {
        Ok((n, source)) => {
            buf.truncate(n);

            trace!(
                source = %source,
                bytes = n,
                "Received UDP packet"
            );

            // Parse data to a DatagramRecv, which help preparse network data to
            // figure out the multiplexing of all protocols on one UDP port.
            let Ok(contents) = buf.as_slice().try_into() else {
                debug!(
                    source = %source,
                    bytes = n,
                    "Failed to parse UDP packet contents"
                );
                return None;
            };

            Some(Input::Receive(
                Instant::now(),
                Receive {
                    proto: Protocol::Udp,
                    source,
                    destination: candidate.addr(),
                    contents,
                },
            ))
        }

        Err(e) => match e.kind() {
            // Expected error for set_read_timeout(). One for windows, one for the rest.
            ErrorKind::WouldBlock | ErrorKind::TimedOut => None,
            _ => {
                error!(error = %e, "UDP socket read failed");
                panic!("UdpSocket read failed: {e:?}");
            }
        },
    }
}

/// Poll all the output from the client until it returns a timeout.
/// Collect any output in the queue, transmit data on the socket, return the timeout.
fn poll_until_timeout(
    connection: &mut PeerConnection,
    queue: &mut VecDeque<(String, Propagated)>,
    socket: &UdpSocket,
) -> Instant {
    loop {
        if !connection.is_alive() {
            debug!(
                client_id = %connection.client_id(),
                "Connection no longer alive"
            );
            return Instant::now();
        }

        let propagated = connection.poll_output(socket);

        if let Propagated::Timeout(t) = propagated {
            return t;
        }

        queue.push_back((connection.client_id().to_string(), propagated))
    }
}
