extern crate derive_more;
// use the derives that you want in the file
use derive_more::TryInto;

use jsonrpc_core::Result;
use jsonrpc_derive::rpc;
use jsonrpc_pubsub::{typed, SubscriptionId};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use sobaka_sample_audio_core::node::{
    filter::node::FilterState,
    oscillator::OscillatorState,
    parameter::ParameterState,
    quantiser::QuantiserState,
    sequencer::{SequencerEvent, SequencerState},
    AudioInput,
};

#[derive(Serialize, Deserialize, JsonSchema)]
pub enum NodeType {
    Delay,
    Envelope,
    Filter,
    Noise,
    Oscillator,
    Parameter,
    Quantiser,
    Reverb,
    SampleAndHold,
    Sequencer,
    Sink,
    Sum,
    Volume,
}

pub type NodeInputTypeDTO = AudioInput;

#[derive(Serialize, Deserialize, JsonSchema, TryInto)]
pub enum NodeStateDTO {
    Filter(FilterState),
    Oscillator(OscillatorState),
    Parameter(ParameterState),
    Quantiser(QuantiserState),
    Sequencer(SequencerState),
}

#[derive(Serialize, Deserialize, JsonSchema, TryInto)]
pub enum NodeEventDTO {
    Sequencer(SequencerEvent),
}

#[rpc(server)]
pub trait SobakaGraphRpc {
    type Metadata;

    /// Create a new instane of node
    #[rpc(name = "node/create")]
    fn create_node(
        &self,
        node_type: NodeType,
        initial_state: Option<NodeStateDTO>,
    ) -> Result<usize>;

    /// Dispose of node instance
    #[rpc(name = "node/dispose")]
    fn dispose_node(&self, node_id: usize) -> Result<bool>;

    /// Connect the output of module a to the input type of module b
    #[rpc(name = "node/connect")]
    fn connect_node(
        &self,
        node_id_a: usize,
        node_id_b: usize,
        input_name: NodeInputTypeDTO,
    ) -> Result<usize>;

    /// Remove connection by connection id
    #[rpc(name = "node/disconnect")]
    fn disconnect_node(&self, connection_id: usize) -> Result<bool>;

    /// Update the state of a node
    #[rpc(name = "node/update")]
    fn update_node(&self, node_id: usize, state: NodeStateDTO) -> Result<bool>;

    /// Subscribe to node state changes
    #[pubsub(subscription = "node", subscribe, name = "node/subscribe")]
    fn subscribe_node(
        &self,
        meta: Self::Metadata,
        subscriber: typed::Subscriber<NodeEventDTO>,
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
