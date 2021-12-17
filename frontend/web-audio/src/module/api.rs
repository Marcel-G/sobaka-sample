extern crate derive_more;
// use the derives that you want in the file
use derive_more::TryInto;

use jsonrpc_core::Result;
use jsonrpc_derive::rpc;
use jsonrpc_pubsub::{typed, SubscriptionId};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use sobaka_sample_audio_core::modules::{
    clock::ClockInput,
    envelope::EnvelopeInput,
    oscillator::{OscillatorInput, OscillatorState},
    parameter::node::ParameterState,
    sequencer::{node::SequencerState, SequencerInput},
    sink::SinkInput,
    volume::VolumeInput,
};

#[derive(Serialize, Deserialize, JsonSchema)]
pub enum ModuleType {
    Clock,
    Envelope,
    Oscillator,
    Parameter,
    Sequencer,
    Volume,
    Sink,
}

#[derive(Serialize, Deserialize, JsonSchema, TryInto)]
pub enum InputTypeDTO {
    Clock(ClockInput),
    Envelope(EnvelopeInput),
    Oscillator(OscillatorInput),
    Sequencer(SequencerInput),
    Volume(VolumeInput),
    Sink(SinkInput),
}

#[derive(Serialize, Deserialize, JsonSchema, TryInto)]
pub enum ModuleStateDTO {
    Oscillator(OscillatorState),
    Parameter(ParameterState),
    Sequencer(SequencerState),
}

#[rpc(server)]
pub trait ModuleRpc {
    type Metadata;

    /// Create a new instane of module
    #[rpc(name = "module/create")]
    fn create_module(
        &self,
        module_type: ModuleType,
        initial_state: Option<ModuleStateDTO>,
    ) -> Result<usize>;

    /// Dispose of module instance
    #[rpc(name = "module/dispose")]
    fn dispose_module(&self, module_id: usize) -> Result<bool>;

    /// Connect the output of module a to the input type of module b
    #[rpc(name = "module/connect")]
    fn connect_module(
        &self,
        module_id_a: usize,
        module_id_b: usize,
        input_name: InputTypeDTO,
    ) -> Result<usize>;

    /// Remove connection by connection id
    #[rpc(name = "module/disconnect")]
    fn disconnect_module(&self, connection_id: usize) -> Result<bool>;

    /// Update the state of a module
    #[rpc(name = "module/update")]
    fn update_module(&self, module_id: usize, state: ModuleStateDTO) -> Result<bool>;

    /// Subscribe to module state changes
    #[pubsub(subscription = "module", subscribe, name = "module/subscribe")]
    fn subscribe_module(
        &self,
        meta: Self::Metadata,
        subscriber: typed::Subscriber<ModuleStateDTO>,
        module_id: usize,
    );

    /// Unsubscribe to module state changes
    #[pubsub(subscription = "module", unsubscribe, name = "module/unsubscribe")]
    fn unsubscribe_module(
        &self,
        meta: Option<Self::Metadata>,
        subscription: SubscriptionId,
    ) -> Result<bool>;
}
