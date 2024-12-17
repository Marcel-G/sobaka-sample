use std::{
    collections::HashMap, sync::Arc, task::{Context, Poll}
};

use lmdb_rs::{core::DbCreate, Environment};
use serde_json::Value;
use yrs::{
    sync::{Awareness, DefaultProtocol, Message, Protocol, SyncMessage},
    updates::decoder::Decode,
    ReadTxn, Subscription, Transact, Update,
};
use yrs_lmdb::LmdbStore;
use yrs_kvstore::DocOps;

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
        let env = Environment::new()
            .autocreate_dir(true)
            .map_size(256 * 1024 * 1024)
            .max_dbs(1)
            .open(".db", 0o777)
            .unwrap();

        let doc_name = "test";

        let env = Arc::new(env);
        let handle = Arc::new(env.create_db("test", DbCreate).unwrap());
        let awareness = Awareness::default();

        let subscription = {
            let env = env.clone();
            let handle = handle.clone();
            awareness
                .doc()
                .observe_update_v1(move |_, e| {
                    let txn = env.new_transaction().unwrap();
                    let db = LmdbStore::from(txn.bind(&handle));
                    let i = db.push_update(doc_name, &e.update).unwrap();
                    if i % 128 == 0 {
                        // compact updates into document
                        db.flush_doc(doc_name).unwrap();
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
            db.load_doc(&doc_name, &mut txn).unwrap();
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
                        },
                        Err(e) => {
                            log::error!("Failed to handle message: {e:?}");
                        },
                        _ => {},
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
                    let sv = self.awareness.doc().transact().state_vector();
                    let sync_step1 = Message::Sync(SyncMessage::SyncStep1(sv));
                    let awareness_query = Message::AwarenessQuery;
                    connection.send(sync_step1.clone());
                    connection.send(awareness_query.clone());

                    continue;
                },
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
