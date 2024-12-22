use std::{
    collections::{hash_map::Entry, HashMap},
    sync::Arc,
    task::{Context, Poll},
};

use lmdb_rs::{core::DbCreate, Environment};
use serde_json::Value;
use yrs::{
    sync::{Awareness, DefaultProtocol, Message, Protocol, SyncMessage},
    ReadTxn, Subscription, Transact, Update,
};
use yrs_kvstore::DocOps;
use yrs_lmdb::LmdbStore;

use crate::peer::connection::{NegotiationMode, PeerConnEvent, PeerConnection};

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
    pub fn new(uuid: &str) -> Self {
        let env = Environment::new()
            .autocreate_dir(true)
            .map_size(256 * 1024 * 1024)
            .max_dbs(1)
            .open(".db", 0o777)
            .unwrap();

        let env = Arc::new(env);
        let handle = Arc::new(env.create_db(uuid, DbCreate).unwrap());
        let awareness = Awareness::default();

        let subscription = {
            let env = env.clone();
            let handle = handle.clone();
            let uuid = uuid.to_string();
            awareness
                .doc()
                .observe_update_v1(move |_, e| {
                    let txn = env.new_transaction().unwrap();
                    let db = LmdbStore::from(txn.bind(&handle));
                    let i = db.push_update(&uuid, &e.update).unwrap();
                    if i % 128 == 0 {
                        // compact updates into document
                        db.flush_doc(&uuid).unwrap();
                    }
                    txn.commit().unwrap();
                })
                .unwrap()
        };

        {
            // load document using readonly transaction
            let mut txn = awareness.doc().transact_mut();
            let db_txn = env.get_reader().unwrap();
            let db = LmdbStore::from(db_txn.bind(&handle));
            db.load_doc(uuid, &mut txn).unwrap();
        };

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

    pub fn poll_output(
        &mut self,
        cx: &mut Context,
    ) -> Poll<Result<WorkspaceEvent, WorkspaceError>> {
        // Poll all the peers for updates
        for (peer_id, connection) in self.peers.iter_mut() {
            match connection.poll_output(cx) {
                Poll::Ready(Ok(PeerConnEvent::IncomingMessage(message))) => {
                    match DefaultProtocol.handle_message(&self.awareness, message) {
                        Ok(Some(reply)) => {
                            connection.send(reply);
                        }
                        Err(e) => {
                            log::error!("Failed to handle message: {e:?}");
                        }
                        _ => {}
                    }
                    continue;
                }
                Poll::Ready(Ok(PeerConnEvent::OutboundSignal(signal))) => {
                    let signal = serde_json::to_value(signal).expect("Failed to serialize signal");
                    return Poll::Ready(Ok(WorkspaceEvent::OutboundSignal(
                        peer_id.clone(),
                        signal,
                    )));
                }
                Poll::Ready(Ok(PeerConnEvent::Connected)) => {
                    log::info!("peer-conn [{}]: connected", peer_id);
                    let sv = self.awareness.doc().transact().state_vector();
                    let sync_step1 = Message::Sync(SyncMessage::SyncStep1(sv));
                    let awareness_query = Message::AwarenessQuery;
                    connection.send(sync_step1.clone());
                    connection.send(awareness_query.clone());

                    continue;
                }
                Poll::Ready(Ok(PeerConnEvent::Disconnect)) => {
                    log::info!("peer-conn [{}]: disconnect", peer_id);
                    continue;
                }
                Poll::Ready(Err(e)) => {
                    log::error!("peer-conn error: {e:?}");
                    return Poll::Ready(Err(WorkspaceError::Todo));
                }
                Poll::Pending => {}
            };
        }

        return Poll::Pending;
    }
}
