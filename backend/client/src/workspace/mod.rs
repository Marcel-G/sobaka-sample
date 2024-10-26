use std::collections::HashMap;

use serde_json::Value;
use yrs::{
    sync::{Awareness, DefaultProtocol, Message, Protocol, SyncMessage},
    updates::decoder::Decode,
    ReadTxn, Subscription, Transact, Update,
};

use crate::peer::connection::{PeerConnEvent, PeerConnection};

pub struct Workspace {
    awareness: Awareness,
    subscription: Subscription,
    pub peers: HashMap<String, PeerConnection>,
}

pub enum WorkspaceEvent {
    OutboundSignal(String, Value),
    Closed,
}

pub enum WorkspaceError {
    Todo,
}

impl Workspace {
    pub fn new() -> Self {
        let awareness = Awareness::default();

        let subscription = awareness
            .doc()
            .observe_update_v1(move |_, u| {
                let u = Update::decode_v1(&u.update).unwrap();
                log::info!("update decoded: {u}");
            })
            .unwrap();

        Self {
            subscription,
            awareness,
            peers: HashMap::new(),
        }
    }

    pub fn close(&mut self) {
        for (_remote_peer_id, conn) in self.peers.iter_mut() {
            conn.close();
        }
    }

    // TODO: What does this do?
    pub fn idk(&mut self) {
        let sv = self.awareness.doc().transact().state_vector();
        let sync_step1 = Message::Sync(SyncMessage::SyncStep1(sv));
        let awareness_query = Message::AwarenessQuery;
        for (_remote_peer_id, conn) in self.peers.iter_mut() {
            conn.send(sync_step1.clone());
            conn.send(awareness_query.clone());
        }
    }

    pub fn poll_output(&mut self) -> Result<Option<WorkspaceEvent>, WorkspaceError> {
        // Poll all the peers for updates
        for (peer_id, connection) in self.peers.iter_mut() {
            match connection.poll_output() {
                Ok(Some(PeerConnEvent::IncomingMessage(message))) => {
                    log::info!("peer-conn incoming message: {message:?}");

                    if let Some(message) = DefaultProtocol
                        .handle_message(&self.awareness, message)
                        .map_err(|_| WorkspaceError::Todo)?
                    {
                        connection.send(message);
                    }
                    continue;
                }
                Ok(Some(PeerConnEvent::OutboundSignal(signal))) => {
                    let signal = serde_json::to_value(signal).expect("Failed to serialize signal");
                    return Ok(Some(WorkspaceEvent::OutboundSignal(
                        peer_id.clone(),
                        signal,
                    )));
                }
                Ok(None) => return Ok(None),
                _ => return Err(WorkspaceError::Todo),
            };
        }

        return Ok(None);
    }
}
