use std::{
    collections::{hash_map::Entry, HashMap},
    task::{Context, Poll},
};

use serde_json::Value;
use tokio::signal::unix::{signal, Signal, SignalKind};
use url::Url;
use yrs::{uuid_v4, Uuid};

use crate::{
    peer::connection::{NegotiationMode, PeerConnection},
    signal::{
        connection::{SignalConnection, SignalEvent, SignalOptions},
        protocol::{Message, MessageData},
    },
    workspace::{Workspace, WorkspaceEvent},
};

pub struct Client {
    peer_id: Uuid,
    shutting_down: bool,
    sigterm: Signal,
    signal_connection: SignalConnection,
    workspaces: HashMap<String, Workspace>,
}

pub struct ClientOptions {
    pub signal_url: String,
}

#[derive(Debug)]
pub enum ClientError {
    ForceShutdown,
}

#[derive(Debug)]
pub enum ClientEvent {
    Closed,
}

impl Client {
    pub fn new_with_options(options: ClientOptions) -> Self {
        Self {
            peer_id: uuid_v4(),
            shutting_down: false,
            sigterm: signal(SignalKind::interrupt()).expect("Failed to create SIGTERM signal"),
            signal_connection: SignalConnection::new_with_options(SignalOptions {
                url: Url::parse(&options.signal_url).expect("Failed to parse signal URL"),
            }),
            workspaces: HashMap::new(),
        }
    }

    // TODO: for testing, keep-alive?
    pub fn connect(&mut self) {
        self.signal_connection.connect();
    }

    fn handle_incoming_signal(
        &mut self,
        workspace_id: String,
        from: String,
        to: String,
        signal: Value,
    ) {
        let Some(workspace) = self.workspaces.get_mut(&workspace_id) else {
            return;
        };

        if to != self.peer_id.to_string() {
            return;
        }

        // Get or create the peer connection
        let peer_connection = workspace
            .peers
            .entry(from.clone())
            .or_insert_with(|| PeerConnection::connect(NegotiationMode::Responder));

        // Handle the incoming signal for negotiation
        peer_connection.handle_incoming_signal(signal);
    }

    fn handle_outgoing_signal(&mut self, workspace_id: String, to: String, signal: Value) {
        let from = self.peer_id.to_string();

        let message = Message::Publish {
            topic: workspace_id,
            data: MessageData::Signal { from, to, signal },
        };
        self.signal_connection.send(message);
    }

    pub fn join_workspace(&mut self, workspace_id: String) {
        let workspace = Workspace::new();

        let subscribe = Message::Subscribe {
            topics: [workspace_id.clone()].to_vec(),
        };
        self.signal_connection.send(subscribe);

        let announce = Message::Publish {
            topic: workspace_id.clone(),
            data: MessageData::Announce {
                from: self.peer_id.to_string(),
            },
        };
        self.signal_connection.send(announce);

        self.workspaces.insert(workspace_id.clone(), workspace);
    }

    fn leave_workspace(&mut self, workspace_id: String) {
        let Some(workspace) = self.workspaces.get_mut(&workspace_id) else {
            return;
        };
        let unsubscribe = Message::Unsubscribe {
            topics: [workspace_id.clone()].to_vec(),
        };
        self.signal_connection.send(unsubscribe);

        workspace.close();
    }

    fn handle_peer_discovered(&mut self, workspace_id: String, from: String) {
        if from == self.peer_id.to_string() {
            return;
        }
        let workspace = self
            .workspaces
            .get_mut(&workspace_id)
            .expect("Workspace not found");

        // If we don't already have a peer connection, initiate one.
        if let Entry::Vacant(entry) = workspace.peers.entry(from.clone()) {
            entry.insert(PeerConnection::connect(NegotiationMode::Initiator));
        }
    }

    pub fn poll(&mut self, cx: &mut Context) -> Poll<Result<ClientEvent, ClientError>> {
        loop {
            // 1. Work on the signal connection
            match self.signal_connection.poll(cx) {
                Poll::Ready(Ok(SignalEvent::IncomingMessage(message))) => match message {
                    Message::Publish { topic, data } => match data {
                        MessageData::Announce { from } => {
                            self.handle_peer_discovered(topic, from);
                            continue;
                        }
                        MessageData::Signal { from, to, signal } => {
                            self.handle_incoming_signal(topic, from, to, signal);
                            continue;
                        }
                    },
                    message => {
                        log::trace!("unhandled message {message:?}");
                        continue;
                    }
                },
                Poll::Ready(Ok(SignalEvent::Closed)) => {
                    return Poll::Ready(Ok(ClientEvent::Closed));
                }
                Poll::Ready(event) => {
                    log::trace!("unhandled event {event:?}");
                    continue;
                }
                Poll::Pending => {}
            }

            // 2. Handle SIGTERM
            if self.sigterm.poll_recv(cx).is_ready() {
                if self.shutting_down {
                    // Received a repeated SIGTERM whilst shutting down
                    return Poll::Ready(Err(ClientError::ForceShutdown));
                }

                log::info!("Received SIGTERM, initiating graceful shutdown");

                self.shutting_down = true;

                self.signal_connection.close().expect("issue with closing");

                continue;
            }

            // 3. Work on the workspace connections
            let workspace_events = self
                .workspaces
                .iter_mut()
                .map(|(id, workspace)| (id.clone(), workspace.poll_output(cx)))
                .collect::<Vec<_>>();

            for (workspace_id, event) in workspace_events {
                match event {
                    Poll::Ready(Ok(WorkspaceEvent::OutboundSignal(from, signal))) => {
                        self.handle_outgoing_signal(workspace_id, from, signal);
                    }
                    _ => {}
                }
            }

            return Poll::Pending;
        }
    }
}
