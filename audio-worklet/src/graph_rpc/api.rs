extern crate derive_more;
use dasp::graph::Node;
// use the derives that you want in the file

use jsonrpc_core::Result;
use jsonrpc_derive::rpc;
use jsonrpc_pubsub::{typed, SubscriptionId};
use sobaka_sample_audio_core::node::{AudioNodeEvent, AudioNodeInput, AudioNodeState};
#[rpc(server)]
pub trait SobakaGraphRpc {
    type Metadata;

    /// Create a new instane of node
    #[rpc(name = "node/create")]
    fn create_node(&self, node_state: AudioNodeState) -> Result<usize>;

    /// Dispose of node instance
    #[rpc(name = "node/dispose")]
    fn dispose_node(&self, node_id: usize) -> Result<bool>;

    /// Connect the output of module a to the input type of module b
    #[rpc(name = "node/connect")]
    fn connect_node(
        &self,
        node_id_a: usize,
        node_id_b: usize,
        input: AudioNodeInput,
    ) -> Result<usize>;

    /// Remove connection by connection id
    #[rpc(name = "node/disconnect")]
    fn disconnect_node(&self, connection_id: usize) -> Result<bool>;

    /// Update the state of a node
    #[rpc(name = "node/update")]
    fn update_node(&self, node_id: usize, node_state: AudioNodeState) -> Result<bool>;

    /// Subscribe to node state changes
    #[pubsub(subscription = "node", subscribe, name = "node/subscribe")]
    fn subscribe_node(
        &self,
        meta: Self::Metadata,
        subscriber: typed::Subscriber<AudioNodeEvent>,
        node_id: usize,
    );

    /// Unsubscribe to node state changes
    #[pubsub(subscription = "node", unsubscribe, name = "node/unsubscribe")]
    fn unsubscribe_node(
        &self,
        meta: Option<Self::Metadata>,
        subscription: SubscriptionId,
    ) -> Result<bool>;
}
