use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use lmdb_rs::{DbFlags, DbHandle, EnvBuilder, Environment};
use tracing::{debug, error, info, trace, warn};
use yrs::sync::{Awareness, SyncMessage};
use yrs::updates::encoder::{Encoder, EncoderV1};
use yrs::{
    sync::{DefaultProtocol, Message, Protocol},
    updates::{decoder::Decode, encoder::Encode},
    Subscription,
};
use yrs::{Array, ArrayPrelim, Doc, Map, MapPrelim, Out, ReadTxn, Transact, UpdateEvent, WriteTxn};
use yrs_kvstore::DocOps;
use yrs_lmdb::LmdbStore;

use crate::peer::connection::PeerConnection;
use crate::signal::protocol::{PeerKind, GLOBAL_ROOT_UUID};

/// UUID for the "Intro" workspace list within the global root
const INTRO_LIST_UUID: &str = "00000000-0000-0000-0000-000000000001";

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

        let db = Self { env, handle };
        
        // Bootstrap global root if it doesn't exist
        db.bootstrap_global_root();
        
        db
    }

    /// Check if a document exists in the database by verifying it has content.
    /// A document "exists" if after loading, the state vector is non-empty.
    fn doc_exists(&self, topic: &str) -> bool {
        let db_txn = match self.env.get_reader() {
            Ok(r) => r,
            Err(_) => return false,
        };

        let db = LmdbStore::from(db_txn.bind(&self.handle));
        
        // Load the document and check if it has any state
        let doc = Doc::new();
        {
            let mut txn = doc.transact_mut();
            if db.load_doc(topic, &mut txn).is_err() {
                return false;
            }
        }
        
        // Check if the document has any content by looking at its state vector
        let txn = doc.transact();
        let state_vector = txn.state_vector();
        
        // State vector is empty (no client IDs have ever written) means doc doesn't exist
        !state_vector.is_empty()
    }

    /// Bootstrap the global root document with the "Intro" workspace list.
    /// This is called on startup to ensure the global root exists.
    fn bootstrap_global_root(&self) {
        if self.doc_exists(GLOBAL_ROOT_UUID) {
            debug!("Global root already exists, skipping bootstrap");
            return;
        }

        info!("Bootstrapping global root document");

        // Create the Intro workspace list document first
        self.create_workspace_list(INTRO_LIST_UUID, "Intro");
        
        // Create the global root document
        self.create_root_document(GLOBAL_ROOT_UUID, INTRO_LIST_UUID);
        
        info!("Global root bootstrapped successfully");
    }

    /// Create a workspace list document with the given UUID and name
    fn create_workspace_list(&self, uuid: &str, name: &str) {
        let doc = Doc::new();
        
        {
            let mut txn = doc.transact_mut();
            
            // Create meta map
            let meta = txn.get_or_insert_map("meta");
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("Time went backwards")
                .as_millis() as f64;
            
            meta.insert(&mut txn, "kind", "workspaceList");
            meta.insert(&mut txn, "createdAt", now);
            meta.insert(&mut txn, "updatedAt", now);
            meta.insert(&mut txn, "name", name);
            
            // Create empty collaborators array (anyone can read, admins can write)
            let collaborators = ArrayPrelim::from(Vec::<String>::new());
            meta.insert(&mut txn, "collaborators", collaborators);
            
            // Create empty workspaces array
            let _workspaces = txn.get_or_insert_array("workspaces");
        }
        
        // Save to database
        let update = doc.transact().encode_state_as_update_v1(&Default::default());
        self.save_update(uuid, &update);
        
        debug!(uuid = %uuid, name = %name, "Created workspace list document");
    }

    /// Create a root document with the given UUID and a reference to a workspace list
    fn create_root_document(&self, uuid: &str, list_uuid: &str) {
        let doc = Doc::new();
        
        {
            let mut txn = doc.transact_mut();
            
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("Time went backwards")
                .as_millis() as f64;
            
            // Create meta map
            let meta = txn.get_or_insert_map("meta");
            meta.insert(&mut txn, "kind", "root");
            meta.insert(&mut txn, "createdAt", now);
            meta.insert(&mut txn, "updatedAt", now);
            
            // Create empty collaborators array
            let collaborators = ArrayPrelim::from(Vec::<String>::new());
            meta.insert(&mut txn, "collaborators", collaborators);
            
            // Create workspaceLists array with reference to the Intro list
            let workspace_lists = txn.get_or_insert_array("workspaceLists");
            
            // Add reference to the Intro list (as a map with guid field)
            let list_ref = MapPrelim::from([("guid", list_uuid)]);
            workspace_lists.insert(&mut txn, 0, list_ref);
        }
        
        // Save to database
        let update = doc.transact().encode_state_as_update_v1(&Default::default());
        self.save_update(uuid, &update);
        
        debug!(uuid = %uuid, "Created root document");
    }

    /// Save an update to the database
    fn save_update(&self, topic: &str, update: &[u8]) {
        let txn = match self.env.new_transaction() {
            Ok(t) => t,
            Err(e) => {
                error!(topic = %topic, error = ?e, "Failed to start transaction for save");
                return;
            }
        };

        let db = LmdbStore::from(txn.bind(&self.handle));

        if let Err(e) = db.push_update(topic, update) {
            error!(topic = %topic, error = ?e, "Failed to save document");
            return;
        }

        if let Err(e) = txn.commit() {
            error!(topic = %topic, error = ?e, "Failed to commit save transaction");
        }
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
