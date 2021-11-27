use std::{collections::HashMap, sync::{Arc, Mutex, atomic}};

use async_std::{future::IntoFuture, task};
use futures::{TryFutureExt, future::{self, select}};
use jsonrpc_pubsub::{SubscriptionId, oneshot, typed};

use crate::module::api::ModuleStateDTO;

#[derive(Default)]
struct IdProvider (atomic::AtomicUsize);

impl IdProvider {
  pub fn next(&self) -> u64 {
    self.0.fetch_add(1, atomic::Ordering::SeqCst) as u64
  }
}

#[derive(Default)]
pub struct Subscriptions {
  id_provider: IdProvider,
  active_subscriptions: Arc<Mutex<HashMap<u64, oneshot::Sender<()>>>>,
}


impl Subscriptions { // @todo ModuleStateDTO should be generic
  pub fn add<G, R, F>(&self, subscriber: typed::Subscriber<ModuleStateDTO>, into_future: G) -> SubscriptionId
  where G: FnOnce(typed::Sink<ModuleStateDTO>) -> R,
        R: IntoFuture<Future=F>,
        F: future::Future<Output=()> + Unpin + Send + 'static {
    let id = self.id_provider.next();
    let subscription_id: SubscriptionId = id.into();
    if let Ok(sink) = subscriber.assign_id(subscription_id.clone()) {
      let (tx, rx) = oneshot::channel();
      let future = select(
        into_future(sink).into_future(),
        rx.map_err(|e| panic!("Error timeing out: {:?}", e))
      );

      self.active_subscriptions.lock().unwrap().insert(id, tx);
      task::spawn_local(future);
    }
    subscription_id
  }

  pub fn cancel(&self, id: SubscriptionId) -> bool {
    if let SubscriptionId::Number(id) = id {
      if let Some(tx) = self.active_subscriptions.lock().unwrap().remove(&id) {
        let _ = tx.send(());
        return true;
      }
    }
    false
  }
}