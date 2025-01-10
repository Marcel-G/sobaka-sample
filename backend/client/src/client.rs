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
use yrs::{uuid_v4, Uuid};

use crate::{
    peer::connection::{PeerConnection, Propagated},
    signal::{
        connection::WebSocketHandle,
        protocol::{Message, MessageData},
    },
    workspace::{Db, Workspace},
};

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
}

impl Client {
    pub fn new(socket: UdpSocket, candidate: Candidate, ws_handle: WebSocketHandle) -> Self {
        Self {
            candidate,
            buf: vec![0; 2000],
            connections: Vec::new(),
            db: Arc::new(Db::new()),
            peer_id: uuid_v4(),
            socket,
            to_propagate: VecDeque::new(),
            workspaces: HashMap::new(),
            ws_handle,
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
        let Ok(signal) = serde_json::from_value(signal.clone()) else {
            // mDNS signals are not supported by Candidate, if one is received, ignore it.
            log::warn!(
                "failed to parse signal, ignoring it, {}",
                signal.to_string()
            );
            return;
        };

        if to != self.peer_id.to_string() {
            return;
        }

        // Get or create the peer connection
        if let Some(connection) = self
            .connections
            .iter_mut()
            .find(|con| con.client_id() == from)
        {
            connection.handle_signal(signal)
        } else {
            let mut connection = PeerConnection::new(
                self.candidate.clone(),
                identity.clone(),
                from.clone(),
                topic.clone(),
            );
            connection.handle_signal(signal);
            self.connections.push(connection);
        }
    }

    fn handle_outgoing_signal(&mut self, topic: String, to: String, signal: Value) {
        let from = self.peer_id.to_string();

        let message = Message::Publish {
            topic,
            identity: None,
            kind: None,
            data: MessageData::Signal { from, to, signal },
        };
        self.ws_handle.send(message).expect("send to succeed");
    }

    pub fn join_topic(&mut self, topic: String) {
        let subscribe = Message::Subscribe {
            topics: [topic.clone()].to_vec(),
        };
        self.ws_handle.send(subscribe).expect("send to succeed");

        if !self.workspaces.contains_key(&topic) {
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
        self.ws_handle.send(announce).expect("send to succeed");
    }

    fn leave_workspace(&mut self, workspace_id: String) {
        let Some(_workspace) = self.workspaces.get_mut(&workspace_id) else {
            return;
        };
        let unsubscribe = Message::Unsubscribe {
            topics: [workspace_id.clone()].to_vec(),
        };
        self.ws_handle.send(unsubscribe).expect("send to succeed");
    }

    fn handle_peer_discovered(&mut self, topic: String, from: String) {
        if from == self.peer_id.to_string() {
            return;
        }

        self.join_topic(topic.clone());
    }

    pub fn run(&mut self) {
        loop {
            self.connections.retain(|conn| conn.is_alive());

            match self.ws_handle.receiver().try_recv().ok() {
                Some(Message::Publish {
                    topic,
                    data,
                    identity,
                    ..
                }) => match data {
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
                    _ => {}
                },
                _ => {}
            }

            // Poll connections until they return timeout
            let mut timeout = Instant::now() + Duration::from_millis(100);
            for connection in self.connections.iter_mut() {
                let t = poll_until_timeout(connection, &mut self.to_propagate, &self.socket);
                timeout = timeout.min(t);
            }

            // If we have an item to propagate, do that
            if let Some(p) = self.to_propagate.pop_front() {
                match p {
                    (client_id, Propagated::Data(topic, data)) => {
                        if let Some(workspace) = self.workspaces.get_mut(&topic) {
                            let client = self
                                .connections
                                .iter_mut()
                                .find(|c| c.client_id() == client_id)
                                .expect("client to exist");

                            workspace.handle_input(&data, client);
                        }
                    }
                    (client_id, Propagated::Signal(topic, signal)) => {
                        self.handle_outgoing_signal(
                            topic,
                            client_id,
                            serde_json::to_value(signal).expect("Failed to serialize"),
                        );
                    }
                    (client_id, Propagated::Connected(topic)) => {
                        if let Some(workspace) = self.workspaces.get_mut(&topic) {
                            let client = self
                                .connections
                                .iter_mut()
                                .find(|c| c.client_id() == client_id)
                                .expect("client to exist");

                            workspace.handle_connection(client);
                        }
                    }
                    _ => {}
                }
                // TODO: update workspace with data
                continue;
            }

            // The read timeout is not allowed to be 0. In case it is 0, we set 1 millisecond.
            let duration = (timeout - Instant::now()).max(Duration::from_millis(1));
            self.socket
                .set_read_timeout(Some(duration))
                .expect("setting socket read timeout");

            if let Some(input) = read_socket_input(&self.socket, &mut self.buf) {
                // The rtc.accepts() call is how we demultiplex the incoming packet to know which
                // Rtc instance the traffic belongs to.
                if let Some(client) = self.connections.iter_mut().find(|c| c.accepts(&input)) {
                    // We found the client that accepts the input.
                    client.handle_input(input);
                } else {
                    // This is quite common because we don't get the Rtc instance via the mpsc channel
                    // quickly enough before the browser send the first STUN.
                    log::debug!("No client accepts UDP input: {:?}", input);
                }
            }

            // Drive time forward in all clients.
            let now = Instant::now();
            for connection in &mut self.connections {
                connection.handle_input(Input::Timeout(now));
            }
        }
    }
}

fn read_socket_input<'a>(socket: &UdpSocket, buf: &'a mut Vec<u8>) -> Option<Input<'a>> {
    buf.resize(2000, 0);

    match socket.recv_from(buf) {
        Ok((n, source)) => {
            buf.truncate(n);

            // Parse data to a DatagramRecv, which help preparse network data to
            // figure out the multiplexing of all protocols on one UDP port.
            let Ok(contents) = buf.as_slice().try_into() else {
                return None;
            };

            Some(Input::Receive(
                Instant::now(),
                Receive {
                    proto: Protocol::Udp,
                    source,
                    destination: socket.local_addr().unwrap(),
                    contents,
                },
            ))
        }

        Err(e) => match e.kind() {
            // Expected error for set_read_timeout(). One for windows, one for the rest.
            ErrorKind::WouldBlock | ErrorKind::TimedOut => None,
            _ => panic!("UdpSocket read failed: {e:?}"),
        },
    }
}

/// Poll all the output from the client until it returns a timeout.
/// Collect any output in the queue, transmit data on the socket, return the timeout
fn poll_until_timeout(
    connection: &mut PeerConnection,
    queue: &mut VecDeque<(String, Propagated)>,
    socket: &UdpSocket,
) -> Instant {
    loop {
        if !connection.is_alive() {
            // This client will be cleaned up in the next run of the main loop.
            return Instant::now();
        }

        let propagated = connection.poll_output(socket);

        if let Propagated::Timeout(t) = propagated {
            return t;
        }

        queue.push_back((connection.client_id().to_string(), propagated))
    }
}
