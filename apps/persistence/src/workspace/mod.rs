use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use lmdb_rs::{DbFlags, DbHandle, EnvBuilder, Environment};
use tracing::{debug, error, info, trace, warn};
use yrs::sync::{Awareness, AwarenessUpdate, SyncMessage};
use yrs::updates::encoder::{Encoder, EncoderV1};
use yrs::{
    sync::{DefaultProtocol, Message, Protocol},
    updates::{decoder::Decode, encoder::Encode},
    Subscription,
};
use yrs::{Array, ArrayPrelim, Doc, Map, Out, ReadTxn, Transact, UpdateEvent, WriteTxn};
use yrs_kvstore::DocOps;
use yrs_lmdb::LmdbStore;

use crate::peer::connection::PeerConnection;
use crate::signal::protocol::{PeerKind, GLOBAL_INTRO_LIST_UUID};

/// y-protocols message types
/// These match the constants in y-protocols (<https://github.com/yjs/y-protocols>)
const MESSAGE_SYNC: u8 = 0;
const MESSAGE_AWARENESS: u8 = 1;
const MESSAGE_QUERY_AWARENESS: u8 = 2;

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

        // DIAGNOSTIC: Log what was loaded from LMDB
        let (kind, name, module_count) = {
            let txn = doc.doc().transact();
            let meta = txn.get_map("meta");
            let kind = meta.as_ref()
                .and_then(|m| m.get(&txn, "kind"))
                .map(|v| format!("{:?}", v))
                .unwrap_or_else(|| "none".to_string());
            let name = meta.as_ref()
                .and_then(|m| m.get(&txn, "name"))
                .map(|v| format!("{:?}", v))
                .unwrap_or_else(|| "none".to_string());
            // Check modules array for workspace documents
            let modules = txn.get_array("modules");
            let module_count = modules.map(|m| m.len(&txn)).unwrap_or(0);
            (kind, name, module_count)
        };
        
        info!(
            workspace_id = %uuid,
            kind = %kind,
            name = %name,
            module_count = module_count,
            "WORKSPACE CREATED: State after loading from LMDB"
        );

        Self {
            _subscription: subscription,
            uuid: uuid.to_string(),
            doc,
        }
    }

    pub fn handle_connection(&self, conn: &mut PeerConnection) {
        // DIAGNOSTIC: Log current document state before sending
        let (kind, name) = {
            let txn = self.doc.doc().transact();
            let meta = txn.get_map("meta");
            let kind = meta.as_ref()
                .and_then(|m| m.get(&txn, "kind"))
                .map(|v| format!("{:?}", v))
                .unwrap_or_else(|| "none".to_string());
            let name = meta.as_ref()
                .and_then(|m| m.get(&txn, "name"))
                .map(|v| format!("{:?}", v))
                .unwrap_or_else(|| "none".to_string());
            (kind, name)
        };
        
        info!(
            workspace_id = %self.uuid,
            client_id = %conn.client_id(),
            kind = %kind,
            name = %name,
            "SYNC START: Document state before sending to client"
        );
        
        // Use yrs's Protocol.start() which encodes SyncStep1 + Awareness in the correct format
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
        // Messages from y-protocols have a message type prefix
        // Format: [message_type: varint, ...payload]
        if input.is_empty() {
            trace!(
                workspace_id = %self.uuid,
                client_id = %conn.client_id(),
                "Received empty message, ignoring"
            );
            return;
        }

        // Read the y-protocols message type (first byte is a varint, usually single byte)
        let (y_protocol_type, payload) = match read_varint(input) {
            Some((t, rest)) => (t, rest),
            None => {
                error!(
                    workspace_id = %self.uuid,
                    client_id = %conn.client_id(),
                    "Failed to read y-protocols message type"
                );
                return;
            }
        };

        match y_protocol_type {
            MESSAGE_SYNC => self.handle_sync_message(payload, conn),
            MESSAGE_AWARENESS => self.handle_awareness_message(payload, conn),
            MESSAGE_QUERY_AWARENESS => self.handle_query_awareness(conn),
            _ => {
                trace!(
                    workspace_id = %self.uuid,
                    client_id = %conn.client_id(),
                    message_type = y_protocol_type,
                    "Unknown y-protocols message type, ignoring"
                );
            }
        }
    }

    fn handle_sync_message(&self, payload: &[u8], conn: &mut PeerConnection) {
        let collaborators = self.collaborators();

        // After stripping MESSAGE_SYNC prefix, the remaining bytes are in SyncMessage format:
        // [sync_step_type (varint), varByteArray(data)]
        // This matches yrs's SyncMessage::decode_v1 format exactly
        let sync_message = match SyncMessage::decode_v1(payload) {
            Ok(m) => m,
            Err(e) => {
                error!(
                    workspace_id = %self.uuid,
                    client_id = %conn.client_id(),
                    error = ?e,
                    payload_len = payload.len(),
                    "Failed to decode Yjs sync message"
                );
                return;
            }
        };
        let message = Message::Sync(sync_message);

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
            "Processing sync message"
        );

        // Access control for write operations
        // - Global root: only Admins can write
        // - Other workspaces: collaborators can write, or anyone if no collaborators set
        match &message {
            Message::Sync(SyncMessage::SyncStep2(_))
            | Message::Sync(SyncMessage::Update(_)) => {
                let is_global_intro_list = self.uuid == GLOBAL_INTRO_LIST_UUID;
                let is_admin = matches!(conn.kind(), PeerKind::Admin);
                
                // For global intro list, only admins can write
                if is_global_intro_list && !is_admin {
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
                if !is_global_intro_list && !is_admin {
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

        // DIAGNOSTIC: Check document state BEFORE applying the message
        let (kind_before, name_before, modules_before) = {
            let txn = self.doc.doc().transact();
            let meta = txn.get_map("meta");
            let kind = meta.as_ref()
                .and_then(|m| m.get(&txn, "kind"))
                .map(|v| format!("{:?}", v))
                .unwrap_or_else(|| "none".to_string());
            let name = meta.as_ref()
                .and_then(|m| m.get(&txn, "name"))
                .map(|v| format!("{:?}", v))
                .unwrap_or_else(|| "none".to_string());
            let modules = txn.get_array("modules").map(|m| m.len(&txn)).unwrap_or(0);
            (kind, name, modules)
        };
        
        match DefaultProtocol.handle_message(&self.doc, message) {
            Ok(Some(reply)) => {
                // DIAGNOSTIC: Check document state AFTER applying the message
                let (kind_after, name_after, modules_after) = {
                    let txn = self.doc.doc().transact();
                    let meta = txn.get_map("meta");
                    let kind = meta.as_ref()
                        .and_then(|m| m.get(&txn, "kind"))
                        .map(|v| format!("{:?}", v))
                        .unwrap_or_else(|| "none".to_string());
                    let name = meta.as_ref()
                        .and_then(|m| m.get(&txn, "name"))
                        .map(|v| format!("{:?}", v))
                        .unwrap_or_else(|| "none".to_string());
                    let modules = txn.get_array("modules").map(|m| m.len(&txn)).unwrap_or(0);
                    (kind, name, modules)
                };
                
                // Log if kind changed
                if kind_before != kind_after {
                    warn!(
                        workspace_id = %self.uuid,
                        kind_before = %kind_before,
                        kind_after = %kind_after,
                        "KIND CHANGED after applying sync message!"
                    );
                }
                
                // Log if name changed (important for tracking merging)
                if name_before != name_after {
                    info!(
                        workspace_id = %self.uuid,
                        name_before = %name_before,
                        name_after = %name_after,
                        msg_type = msg_type,
                        client_id = %conn.client_id(),
                        "NAME CHANGED after applying sync message"
                    );
                }
                
                // Log if module count changed (critical for tracking merging)
                if modules_before != modules_after {
                    info!(
                        workspace_id = %self.uuid,
                        modules_before = modules_before,
                        modules_after = modules_after,
                        msg_type = msg_type,
                        client_id = %conn.client_id(),
                        "MODULES CHANGED after applying sync message"
                    );
                }
                
                // Use yrs's Message.encode_v1() which produces y-protocols compatible format
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
                // DIAGNOSTIC: Check document state AFTER applying the message
                let (kind_after, name_after, modules_after) = {
                    let txn = self.doc.doc().transact();
                    let meta = txn.get_map("meta");
                    let kind = meta.as_ref()
                        .and_then(|m| m.get(&txn, "kind"))
                        .map(|v| format!("{:?}", v))
                        .unwrap_or_else(|| "none".to_string());
                    let name = meta.as_ref()
                        .and_then(|m| m.get(&txn, "name"))
                        .map(|v| format!("{:?}", v))
                        .unwrap_or_else(|| "none".to_string());
                    let modules = txn.get_array("modules").map(|m| m.len(&txn)).unwrap_or(0);
                    (kind, name, modules)
                };
                
                if kind_before != kind_after {
                    warn!(
                        workspace_id = %self.uuid,
                        kind_before = %kind_before,
                        kind_after = %kind_after,
                        "KIND CHANGED after applying sync message (no reply)!"
                    );
                }
                
                if name_before != name_after {
                    info!(
                        workspace_id = %self.uuid,
                        name_before = %name_before,
                        name_after = %name_after,
                        msg_type = msg_type,
                        client_id = %conn.client_id(),
                        "NAME CHANGED after applying sync message (no reply)"
                    );
                }
                
                if modules_before != modules_after {
                    info!(
                        workspace_id = %self.uuid,
                        modules_before = modules_before,
                        modules_after = modules_after,
                        msg_type = msg_type,
                        client_id = %conn.client_id(),
                        "MODULES CHANGED after applying sync message (no reply)"
                    );
                }
                
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
                    "Failed to handle Yjs sync message"
                );
            }
        }
    }

    fn handle_awareness_message(&self, payload: &[u8], conn: &mut PeerConnection) {
        // Awareness messages contain a length-prefixed update
        // Format: [length: varint, ...update_bytes]
        let update_bytes = match read_varint_bytes(payload) {
            Some(bytes) => bytes,
            None => {
                trace!(
                    workspace_id = %self.uuid,
                    client_id = %conn.client_id(),
                    "Failed to read awareness update bytes"
                );
                return;
            }
        };

        // Access control for awareness updates to global intro list
        let is_global_intro_list = self.uuid == GLOBAL_INTRO_LIST_UUID;
        let is_admin = matches!(conn.kind(), PeerKind::Admin);
        
        if is_global_intro_list && !is_admin {
            trace!(
                workspace_id = %self.uuid,
                client_id = %conn.client_id(),
                identity = %conn.identity(),
                kind = ?conn.kind(),
                message_type = "awareness",
                "Ignoring awareness update for global root from non-admin"
            );
            return;
        }

        // Decode and apply awareness update
        let update = match AwarenessUpdate::decode_v1(update_bytes) {
            Ok(u) => u,
            Err(e) => {
                trace!(
                    workspace_id = %self.uuid,
                    client_id = %conn.client_id(),
                    error = ?e,
                    "Failed to decode awareness update"
                );
                return;
            }
        };
        
        if let Err(e) = self.doc.apply_update(update) {
            trace!(
                workspace_id = %self.uuid,
                client_id = %conn.client_id(),
                error = ?e,
                "Failed to apply awareness update"
            );
        } else {
            trace!(
                workspace_id = %self.uuid,
                client_id = %conn.client_id(),
                update_len = update_bytes.len(),
                "Applied awareness update"
            );
        }
    }

    fn handle_query_awareness(&self, conn: &mut PeerConnection) {
        trace!(
            workspace_id = %self.uuid,
            client_id = %conn.client_id(),
            "Received awareness query"
        );
        
        // Get current awareness state and encode it
        match self.doc.update() {
            Ok(update) => {
                let update_bytes = update.encode_v1();
                
                if update.clients.is_empty() {
                    trace!(
                        workspace_id = %self.uuid,
                        client_id = %conn.client_id(),
                        "No awareness state to send"
                    );
                    return;
                }
                
                // Wrap with y-protocols MESSAGE_AWARENESS prefix and length prefix
                let mut reply = Vec::with_capacity(2 + update_bytes.len());
                reply.push(MESSAGE_AWARENESS);
                write_varint(&mut reply, update_bytes.len() as u64);
                reply.extend_from_slice(&update_bytes);
                
                trace!(
                    workspace_id = %self.uuid,
                    client_id = %conn.client_id(),
                    reply_len = reply.len(),
                    client_count = update.clients.len(),
                    "Sending awareness response"
                );

                if let Err(e) = conn.send(&self.uuid, reply) {
                    error!(
                        workspace_id = %self.uuid,
                        client_id = %conn.client_id(),
                        error = ?e,
                        "Failed to send awareness response"
                    );
                }
            }
            Err(e) => {
                trace!(
                    workspace_id = %self.uuid,
                    client_id = %conn.client_id(),
                    error = ?e,
                    "Failed to get awareness update"
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
        
        // Bootstrap global intro list if it doesn't exist
        db.bootstrap_global_intro_list();
        
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

    /// Bootstrap the global "Intro" workspace list.
    /// This is called on startup to ensure the intro list exists.
    /// Each user's root document references this list at position 0.
    fn bootstrap_global_intro_list(&self) {
        if self.doc_exists(GLOBAL_INTRO_LIST_UUID) {
            debug!("Global intro list already exists, skipping bootstrap");
            return;
        }

        info!("Bootstrapping global intro list");

        // Create the Intro workspace list document
        self.create_workspace_list(GLOBAL_INTRO_LIST_UUID, "Intro");
        
        info!("Global intro list bootstrapped successfully");
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
        // DIAGNOSTIC: Log update being stored
        debug!(
            topic = %topic,
            update_size = event.update.len(),
            "STORAGE: Persisting update to LMDB"
        );
        
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
                // DIAGNOSTIC: Log document content summary after load
                let state_vector = txn.state_vector();
                let client_count = state_vector.len();
                
                // Check what kind of document this is
                let meta = txn.get_map("meta");
                let kind = meta.and_then(|m| m.get(&txn, "kind")).map(|v| format!("{:?}", v)).unwrap_or_else(|| "none".to_string());
                
                info!(
                    topic = %topic,
                    client_count = client_count,
                    kind = %kind,
                    "Document loaded successfully"
                );
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

/// Read a varint from the start of a byte slice, returning the value and remaining bytes
fn read_varint(data: &[u8]) -> Option<(u8, &[u8])> {
    if data.is_empty() {
        return None;
    }
    
    // For y-protocols, message types are small values (0, 1, 2)
    // so they fit in a single byte varint (no continuation bit set)
    let first_byte = data[0];
    if first_byte < 128 {
        // Single byte varint
        Some((first_byte, &data[1..]))
    } else {
        // Multi-byte varint - for message types this shouldn't happen
        // but handle it anyway for robustness
        let mut result: u64 = 0;
        let mut shift = 0;
        let mut idx = 0;
        
        while idx < data.len() {
            let byte = data[idx];
            result |= ((byte & 0x7f) as u64) << shift;
            idx += 1;
            
            if byte < 128 {
                return Some((result as u8, &data[idx..]));
            }
            
            shift += 7;
            if shift >= 64 {
                return None; // Overflow
            }
        }
        
        None // Incomplete varint
    }
}

/// Read a varint-prefixed byte array from a slice
fn read_varint_bytes(data: &[u8]) -> Option<&[u8]> {
    let (len, rest) = read_varint_u64(data)?;
    let len = len as usize;
    
    if rest.len() >= len {
        Some(&rest[..len])
    } else {
        None
    }
}

/// Read a varint as u64 from the start of a byte slice
fn read_varint_u64(data: &[u8]) -> Option<(u64, &[u8])> {
    if data.is_empty() {
        return None;
    }
    
    let mut result: u64 = 0;
    let mut shift = 0;
    let mut idx = 0;
    
    while idx < data.len() {
        let byte = data[idx];
        result |= ((byte & 0x7f) as u64) << shift;
        idx += 1;
        
        if byte < 128 {
            return Some((result, &data[idx..]));
        }
        
        shift += 7;
        if shift >= 64 {
            return None; // Overflow
        }
    }
    
    None // Incomplete varint
}

/// Write a varint to a vector
fn write_varint(buf: &mut Vec<u8>, mut value: u64) {
    while value >= 128 {
        buf.push((value as u8) | 0x80);
        value >>= 7;
    }
    buf.push(value as u8);
}
