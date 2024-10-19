use std::{collections::HashMap, sync::Arc};

use tokio::sync::RwLock;
use y_sync::awareness::Awareness;
use yrs::{Transact, UpdateSubscription};
use yrs_lmdb::LmdbStore;
use yrs_webrtc::{Room, SignalingConn};
use yrs_kvstore::DocOps;

use lmdb_rs::core::DbCreate;
use lmdb_rs::{DbHandle, Environment};

pub struct Workspace {
    room: Arc<Room>,
    doc_subscription: UpdateSubscription,
}

impl Workspace {
    pub async fn connect(
        room: Arc<Room>,
        env: Arc<Environment>,
        handle: Arc<DbHandle>,
    ) -> Self {
        let _ = room.connect().await;
        let a = room.awareness().write().await;
        let doc = a.doc();

        let sub = {
            let env = env.clone();
            let handle = handle.clone();
            let room = room.clone();
            doc.observe_update_v1(move |_, e| {
                let doc_name = room.name().as_ref();
                let txn = env.new_transaction().unwrap();
                let db = LmdbStore::from(txn.bind(&handle));
                let i = db.push_update(doc_name, &e.update).unwrap();
                if i % 128 == 0 {
                    // compact updates into document
                    db.flush_doc(doc_name).unwrap();
                }
                txn.commit().unwrap();
            }).unwrap()
        };

        {
            let doc_name = room.name().as_ref();
            // load document using readonly transaction
            let mut txn = doc.transact_mut();
            let db_txn = env.get_reader().unwrap();
            let db = LmdbStore::from(db_txn.bind(&handle));
            db.load_doc(&doc_name, &mut txn).unwrap();
        }

        Self {
            room: room.clone(),
            doc_subscription: sub,
        }
    }
}


#[derive(Clone)]
pub struct Manager {
    rooms: Arc<RwLock<HashMap<String, Workspace>>>,
    signaling_conn: Arc<SignalingConn>,
    env: Arc<Environment>,
    db: Arc<DbHandle>,
}

impl Manager {
    pub fn new(signaling_conn: Arc<SignalingConn>) -> Self {
        let env = Environment::new()
            .autocreate_dir(true)
            .map_size(256 * 1024 * 1024)
            .max_dbs(1)
            .open(".db", 0o777)
            .unwrap();

        let env = Arc::new(env);
        let db = Arc::new(env.create_db("test", DbCreate).unwrap());

        Self {
            rooms: Default::default(),
            signaling_conn,
            env,
            db
        }
    }
    pub async fn manage(&self, topic: String) {
        let mut rooms = self.rooms.write().await;
        match rooms.get(&topic) {
            None => {
                let r1 = Room::open(
                    String::from(&topic),
                    Awareness::default(),
                    [self.signaling_conn.clone()]
                );

                let workspace = Workspace::connect(r1).await;

                rooms.insert(topic, workspace);
            },
            _ => {}
        }
    }
}
