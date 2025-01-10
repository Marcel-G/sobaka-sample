use std::sync::Arc;

use lmdb_rs::{DbFlags, DbHandle, EnvBuilder, Environment};
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

pub struct Workspace {
    doc: Awareness,
    uuid: String,
    _subscription: Subscription,
}

impl Workspace {
    pub fn new(uuid: &str, db: Arc<Db>) -> Self {
        let mut doc: Awareness = Default::default();

        let subscription = {
            let db = db.clone();
            let uuid = uuid.to_string();
            doc.doc()
                .observe_update_v1(move |_, e| {
                    log::debug!("Workspace {} updated", uuid);
                    db.update(&uuid, e)
                })
                .unwrap()
        };

        db.load(&uuid, doc.doc_mut());

        Self {
            _subscription: subscription,
            uuid: uuid.to_string(),
            doc,
        }
    }

    pub fn handle_connection(&self, conn: &mut PeerConnection) {
        let mut encoder = EncoderV1::new();
        DefaultProtocol
            .start(&self.doc, &mut encoder)
            .expect("start failed");

        conn.send(self.uuid.clone(), encoder.to_vec())
            .expect("send failed");
    }

    fn collaborators(&self) -> Vec<String> {
        let txn = self.doc.doc().transact();
        // TODO: serde into struct?
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
        let message = Message::decode_v1(input).expect("decode failed");

        // Allow only read-only messages for non collaborators
        // https://github.com/yjs/y-protocols/blob/40dbe4eebb1e53a7e86932ef3232f9abd5037569/PROTOCOL.md?plain=1#L100-L111
        match message {
            Message::Sync(SyncMessage::SyncStep2(_))
            | Message::Sync(SyncMessage::Update(_))
            | Message::Awareness(_) => {
                if collaborators.len() > 0 && !collaborators.iter().any(|i| i == conn.identity()) {
                    log::warn!(
                        "Rejecting message {:?} is not a collaborator",
                        conn.identity()
                    );
                    return;
                }
            }
            _ => {}
        }

        match DefaultProtocol.handle_message(&self.doc, message) {
            Ok(Some(reply)) => {
                conn.send(self.uuid.clone(), reply.encode_v1())
                    .expect("send failed");
            }
            Err(e) => {
                log::error!("Failed to handle message: {e:?}");
            }
            _ => {}
        }
    }
}

pub struct Db {
    env: Environment,
    handle: DbHandle,
}

impl Db {
    pub fn new() -> Self {
        let env = EnvBuilder::new().open(".db", 0o777).unwrap();

        let handle = env.get_default_db(DbFlags::empty()).unwrap();

        Self { env, handle }
    }

    pub fn update(&self, topic: &str, event: &UpdateEvent) {
        let txn = self.env.new_transaction().unwrap();
        let db = LmdbStore::from(txn.bind(&self.handle));
        let i = db.push_update(topic, &event.update).unwrap();
        if i % 128 == 0 {
            // compact updates into document
            db.flush_doc(topic).unwrap();
        }
        txn.commit().unwrap();
    }

    pub fn load(&self, topic: &str, doc: &mut yrs::Doc) {
        let mut txn = doc.transact_mut();
        let db_txn = self.env.get_reader().unwrap();
        let db = LmdbStore::from(db_txn.bind(&self.handle));
        db.load_doc(topic, &mut txn).unwrap();
    }
}
