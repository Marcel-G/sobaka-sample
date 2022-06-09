use std::sync::atomic;

use jsonrpc_pubsub::manager::IdProvider;

#[derive(Default)]
pub struct AtomicIdProvider(atomic::AtomicUsize);

impl IdProvider for AtomicIdProvider {
    type Id = u64;
    fn next_id(&self) -> Self::Id {
        self.0.fetch_add(1, atomic::Ordering::SeqCst) as u64
    }
}
