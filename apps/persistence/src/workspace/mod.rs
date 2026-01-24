use std::sync::Arc;

use lmdb_rs::{DbFlags, DbHandle, EnvBuilder, Environment};
use tracing::{debug, error, info, trace, warn};
use yrs::sync::{Awareness, SyncMessage};
use yrs::updates::encoder::{Encoder, EncoderV1};
use yrs::{
    sync::{DefaultProtocol, Message, Protocol},
    updates::{decoder::Decode, encoder::Encode},
    Subscription,
};
use yrs::{Array, Map, Out, ReadTxn, Transact, UpdateEvent};
use yrs_kvstore::DocOps;
use yrs_lmdb::LmdbStore;

use crate::peer::connection::PeerConnection;
use crate::signal::protocol::{PeerKind, GLOBAL_ROOT_UUID};

pub struct Workspace {
    doc: Awareness,
    uuid: String,
    _subscription: Subscription,
}

impl Workspace {
    pub fn new(uuid: &str, db: Arc<Db>) -> Self {
        info!(workspace_id = %uuid, "Creating workspace");

        let mut doc: Awareness = Default::default();

        let subscription = {
            let db = db.clone();
            let uuid = uuid.to_string();
            doc.doc()
                .observe_update_v1(move |_, e| {
                    trace!(
                        workspace_id = %uuid,
                        update_size = e.update.len(),
                        "Workspace document updated"
                    );
                    db.update(&uuid, e)
                })
                .unwrap()
        };

        db.load(uuid, doc.doc_mut());

        debug!(workspace_id = %uuid, "Workspace loaded from database");

        Self {
            _subscription: subscription,
            uuid: uuid.to_string(),
            doc,
        }
    }

    pub fn handle_connection(&self, conn: &mut PeerConnection) {
        let mut encoder = EncoderV1::new();

        if let Err(e) = DefaultProtocol.start(&self.doc, &mut encoder) {
            error!(
                workspace_id = %self.uuid,
                client_id = %conn.client_id(),
                error = ?e,
                "Failed to start sync protocol"
            );
            return;
        }

        let sync_data = encoder.to_vec();
        debug!(
            workspace_id = %self.uuid,
            client_id = %conn.client_id(),
            bytes = sync_data.len(),
            "Sending initial sync to client"
        );

        if let Err(e) = conn.send(&self.uuid, sync_data) {
            error!(
                workspace_id = %self.uuid,
                client_id = %conn.client_id(),
                error = ?e,
                "Failed to send initial sync"
            );
        }
    }

    fn collaborators(&self) -> Vec<String> {
        let txn = self.doc.doc().transact();
        match txn
            .get_map("meta")
            .and_then(|meta| meta.get(&txn, "collaborators"))
        {
            Some(Out::YArray(arr)) => arr.iter(&txn).flat_map(|i| i.try_into()).collect(),
            _ => vec![],
        }
    }

    pub fn handle_input(&self, input: &[u8], conn: &mut PeerConnection) {
        let collaborators = self.collaborators();

        let message = match Message::decode_v1(input) {
            Ok(m) => m,
            Err(e) => {
                error!(
                    workspace_id = %self.uuid,
                    client_id = %conn.client_id(),
                    error = ?e,
                    "Failed to decode Yjs message"
                );
                return;
            }
        };

        let msg_type = match &message {
            Message::Sync(SyncMessage::SyncStep1(_)) => "sync_step1",
            Message::Sync(SyncMessage::SyncStep2(_)) => "sync_step2",
            Message::Sync(SyncMessage::Update(_)) => "update",
            Message::Awareness(_) => "awareness",
            _ => "other",
        };

        trace!(
            workspace_id = %self.uuid,
            client_id = %conn.client_id(),
            identity = %conn.identity(),
            message_type = msg_type,
            "Processing message"
        );

        // Access control for write operations
        // - Global root and its subdocs: only Admins can write
        // - Other workspaces: collaborators can write, or anyone if no collaborators set
        match &message {
            Message::Sync(SyncMessage::SyncStep2(_))
            | Message::Sync(SyncMessage::Update(_))
            | Message::Awareness(_) => {
                let is_global_root = self.uuid == GLOBAL_ROOT_UUID;
                let is_admin = matches!(conn.kind(), PeerKind::Admin);
                
                // For global root, only admins can write
                if is_global_root && !is_admin {
                    warn!(
                        workspace_id = %self.uuid,
                        client_id = %conn.client_id(),
                        identity = %conn.identity(),
                        kind = ?conn.kind(),
                        message_type = msg_type,
                        "Rejecting write to global root from non-admin"
                    );
                    return;
                }
                
                // For other workspaces, check collaborators (unless user is admin)
                if !is_global_root && !is_admin {
                    if !collaborators.is_empty() && !collaborators.iter().any(|i| i == conn.identity())
                    {
                        warn!(
                            workspace_id = %self.uuid,
                            client_id = %conn.client_id(),
                            identity = %conn.identity(),
                            message_type = msg_type,
                            collaborator_count = collaborators.len(),
                            "Rejecting write message from non-collaborator"
                        );
                        return;
                    }
                }
            }
            _ => {}
        }

        match DefaultProtocol.handle_message(&self.doc, message) {
            Ok(Some(reply)) => {
                let reply_data = reply.encode_v1();
                trace!(
                    workspace_id = %self.uuid,
                    client_id = %conn.client_id(),
                    reply_size = reply_data.len(),
                    "Sending sync reply"
                );

                if let Err(e) = conn.send(&self.uuid, reply_data) {
                    error!(
                        workspace_id = %self.uuid,
                        client_id = %conn.client_id(),
                        error = ?e,
                        "Failed to send sync reply"
                    );
                }
            }
            Ok(None) => {
                trace!(
                    workspace_id = %self.uuid,
                    client_id = %conn.client_id(),
                    "Message handled, no reply needed"
                );
            }
            Err(e) => {
                error!(
                    workspace_id = %self.uuid,
                    client_id = %conn.client_id(),
                    error = ?e,
                    "Failed to handle Yjs message"
                );
            }
        }
    }
}

pub struct Db {
    env: Environment,
    handle: DbHandle,
}

impl Db {
    pub fn new() -> Self {
        let db_path = std::env::var("DB_PATH").unwrap_or_else(|_| ".db".to_string());
        const DB_SIZE: u64 = 4 * 1024 * 1024 * 1024; // 4 GiB

        info!(
            path = %db_path,
            size_bytes = DB_SIZE,
            "Initializing LMDB database"
        );

        // Ensure the database directory exists
        if let Err(e) = std::fs::create_dir_all(&db_path) {
            error!(
                path = %db_path,
                error = ?e,
                "Failed to create database directory"
            );
            panic!("Failed to create database directory: {:?}", e);
        }

        let env = match EnvBuilder::new().map_size(DB_SIZE).open(&db_path, 0o777) {
            Ok(e) => e,
            Err(e) => {
                error!(
                    path = %db_path,
                    error = ?e,
                    "Failed to open LMDB database"
                );
                panic!("Failed to open LMDB database: {:?}", e);
            }
        };

        let handle = match env.get_default_db(DbFlags::empty()) {
            Ok(h) => h,
            Err(e) => {
                error!(error = ?e, "Failed to get default database handle");
                panic!("Failed to get database handle: {:?}", e);
            }
        };

        info!(path = %db_path, "LMDB database initialized successfully");

        Self { env, handle }
    }

    pub fn update(&self, topic: &str, event: &UpdateEvent) {
        let txn = match self.env.new_transaction() {
            Ok(t) => t,
            Err(e) => {
                error!(
                    topic = %topic,
                    error = ?e,
                    "Failed to start database transaction"
                );
                return;
            }
        };

        let db = LmdbStore::from(txn.bind(&self.handle));

        let update_index = match db.push_update(topic, &event.update) {
            Ok(i) => i,
            Err(e) => {
                error!(
                    topic = %topic,
                    error = ?e,
                    "Failed to push update to database"
                );
                return;
            }
        };

        // Compact updates periodically to prevent unbounded growth
        if update_index % 128 == 0 {
            debug!(
                topic = %topic,
                update_index = update_index,
                "Compacting document updates"
            );

            if let Err(e) = db.flush_doc(topic) {
                error!(
                    topic = %topic,
                    error = ?e,
                    "Failed to compact document"
                );
            }
        }

        if let Err(e) = txn.commit() {
            error!(
                topic = %topic,
                error = ?e,
                "Failed to commit database transaction"
            );
        } else {
            trace!(
                topic = %topic,
                update_size = event.update.len(),
                update_index = update_index,
                "Update persisted to database"
            );
        }
    }

    pub fn load(&self, topic: &str, doc: &mut yrs::Doc) {
        debug!(topic = %topic, "Loading document from database");

        let mut txn = doc.transact_mut();

        let db_txn = match self.env.get_reader() {
            Ok(r) => r,
            Err(e) => {
                error!(
                    topic = %topic,
                    error = ?e,
                    "Failed to get database reader"
                );
                return;
            }
        };

        let db = LmdbStore::from(db_txn.bind(&self.handle));

        match db.load_doc(topic, &mut txn) {
            Ok(_) => {
                debug!(topic = %topic, "Document loaded successfully");
            }
            Err(e) => {
                // This is normal for new documents
                debug!(
                    topic = %topic,
                    error = ?e,
                    "No existing document found (may be new)"
                );
            }
        }
    }
}
