extern crate derive_more;
// use the derives that you want in the file

use jsonrpc_core::Result;
use jsonrpc_derive::rpc;
use jsonrpc_pubsub::{typed, SubscriptionId};

use crate::interface::address::Address;
use crate::interface::message::SobakaMessage;
use crate::module::AudioModuleType;

#[rpc(server)]
pub trait SobakaGraphRpc {
    type Metadata;

    /// Create a new instane of node
    #[rpc(name = "create")]
    fn create(&self, node_state: AudioModuleType) -> Result<Address>;

    /// Dispose of node instance
    #[rpc(name = "dispose")]
    fn dispose(&self, address: Address) -> Result<bool>;

    /// Connect the output of module a to the input type of module b
    #[rpc(name = "connect")]
    fn connect(&self, from: Address, to: Address) -> Result<usize>;

    /// Remove connection by connection id
    #[rpc(name = "disconnect")]
    fn disconnect(&self, id: usize) -> Result<bool>;

    /// Update the state of a node
    #[rpc(name = "message")]
    fn message(&self, message: SobakaMessage) -> Result<bool>;

    /// Subscribe to node state changes
    #[pubsub(subscription = "node", subscribe, name = "subscribe")]
    fn subscribe(
        &self,
        meta: Self::Metadata,
        subscriber: typed::Subscriber<SobakaMessage>,
        node: Address,
    );

    /// Unsubscribe to node state changes
    #[pubsub(subscription = "node", unsubscribe, name = "unsubscribe")]
    fn unsubscribe(
        &self,
        meta: Option<Self::Metadata>,
        subscription: SubscriptionId,
    ) -> Result<bool>;
}
