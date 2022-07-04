use derive_more::{From, TryInto};
use fundsp::prelude::*;
pub mod clock;
pub mod delay;
pub mod envelope;
pub mod filter;
pub mod lfo;
pub mod noise;
pub mod oscillator;
pub mod parameter;
pub mod quantiser;
pub mod reverb;
pub mod sample_and_hold;
pub mod scope;
pub mod sequencer;
pub mod string;
pub mod vca;

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use self::{
    clock::{clock, ClockCommand, ClockParams},
    delay::{delay, DelayCommand, DelayParams},
    envelope::{envelope, EnvelopeCommand, EnvelopeParams},
    filter::{filter, FilterCommand, FilterParams},
    lfo::{lfo, LfoCommand, LfoParams},
    noise::noise,
    oscillator::{oscillator, OscillatorCommand, OscillatorParams},
    parameter::{parameter, ParameterCommand, ParameterParams},
    quantiser::{quantiser, QuantiserCommand, QuantiserParams},
    reverb::{reverb, ReverbCommand, ReverbParams},
    sample_and_hold::sample_and_hold,
    scope::{scope, ScopeCommand, ScopeEvent, ScopeParams},
    sequencer::{sequencer, SequencerCommand, SequencerEvent, SequencerParams},
    string::{string, StringCommand, StringParams},
    vca::{vca, VcaCommand, VcaParams},
};
use crate::context::{GeneralContext, ModuleContext};

#[derive(Serialize, Deserialize, TS)]
#[serde(tag = "node_type", content = "data")]
#[ts(export)]
pub enum AudioModuleType {
    Delay(DelayParams),
    Envelope(EnvelopeParams),
    // Input(InputNode),
    // Midi(MidiNode),
    // Filter(FilterNode),
    Filter(FilterParams),
    Clock(ClockParams),
    Noise,
    Parameter(ParameterParams),
    Oscillator(OscillatorParams),
    Quantiser(QuantiserParams),
    String(StringParams),
    Reverb(ReverbParams),
    SampleAndHold,
    // Sampler(SamplerNode),
    Sequencer(SequencerParams),
    Scope(ScopeParams),
    Lfo(LfoParams),
    // Sum(SumNode),
    Vca(VcaParams),

    Output,
}

#[derive(Serialize, Deserialize, TryInto, Clone, TS)]
#[serde(tag = "node_type", content = "data")]
#[ts(export)]
pub enum AudioModuleCommand {
    Sequencer(SequencerCommand),
    Clock(ClockCommand),
    Delay(DelayCommand),
    Envelope(EnvelopeCommand),
    Filter(FilterCommand),
    Oscillator(OscillatorCommand),
    Parameter(ParameterCommand),
    Quantiser(QuantiserCommand),
    Reverb(ReverbCommand),
    Vca(VcaCommand),
    Scope(ScopeCommand),
    String(StringCommand),
    Lfo(LfoCommand),

    #[serde(skip)]
    NoOp(NoOp),
}

#[derive(Serialize, Deserialize, From, Clone, TS)]
#[serde(tag = "node_type", content = "data")]
#[ts(export)]
pub enum AudioModuleEvent {
    Sequencer(SequencerEvent),

    Scope(ScopeEvent),

    #[serde(skip)]
    NoOp(NoOp),
}

pub type ModuleUnit = Box<dyn AudioUnit32 + Send>;

impl From<&AudioModuleType> for (ModuleUnit, GeneralContext) {
    fn from(node_type: &AudioModuleType) -> Self {
        match node_type {
            AudioModuleType::Oscillator(params) => {
                let mut ctx = ModuleContext::default();
                (Box::new(oscillator(params, &mut ctx)), ctx.boxed())
            }
            AudioModuleType::Parameter(params) => {
                let mut ctx = ModuleContext::default();
                (Box::new(parameter(params, &mut ctx)), ctx.boxed())
            }
            AudioModuleType::Reverb(params) => {
                let mut ctx = ModuleContext::default();
                (Box::new(reverb(params, &mut ctx)), ctx.boxed())
            }
            AudioModuleType::Filter(params) => {
                let mut ctx = ModuleContext::default();
                (Box::new(filter(params, &mut ctx)), ctx.boxed())
            }
            AudioModuleType::Clock(params) => {
                let mut ctx = ModuleContext::default();
                (Box::new(clock(params, &mut ctx)), ctx.boxed())
            }
            AudioModuleType::Sequencer(params) => {
                let mut ctx = ModuleContext::default();
                (Box::new(sequencer(params, &mut ctx)), ctx.boxed())
            }
            AudioModuleType::Vca(params) => {
                let mut ctx = ModuleContext::default();
                (Box::new(vca(params, &mut ctx)), ctx.boxed())
            }
            AudioModuleType::Envelope(params) => {
                let mut ctx = ModuleContext::default();
                (Box::new(envelope(params, &mut ctx)), ctx.boxed())
            }
            AudioModuleType::Noise => {
                let mut ctx = ModuleContext::default();
                (Box::new(noise((), &mut ctx)), ctx.boxed())
            }
            AudioModuleType::Delay(params) => {
                let mut ctx = ModuleContext::default();
                (Box::new(delay(params, &mut ctx)), ctx.boxed())
            }
            AudioModuleType::Scope(params) => {
                let mut ctx = ModuleContext::default();
                (Box::new(scope(params, &mut ctx)), ctx.boxed())
            }
            AudioModuleType::Output => {
                let ctx = ModuleContext::<NoOp, NoOp>::default();
                (Box::new(multipass::<U2, f32>()), ctx.boxed())
            }
            AudioModuleType::String(params) => {
                let mut ctx = ModuleContext::default();
                (Box::new(string(params, &mut ctx)), ctx.boxed())
            }
            AudioModuleType::Lfo(params) => {
                let mut ctx = ModuleContext::default();
                (Box::new(lfo(params, &mut ctx)), ctx.boxed())
            }
            AudioModuleType::Quantiser(params) => {
                let mut ctx = ModuleContext::default();
                (Box::new(quantiser(params, &mut ctx)), ctx.boxed())
            }
            AudioModuleType::SampleAndHold => {
                let mut ctx = ModuleContext::<NoOp, NoOp>::default();
                (Box::new(sample_and_hold((), &mut ctx)), ctx.boxed())
            }
        }
    }
}

/// Placeholder type used to represent no-op event or command
#[derive(Clone)]
pub struct NoOp;
