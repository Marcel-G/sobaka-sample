use derive_more::{From, TryInto};
use fundsp::prelude::*;
pub mod clock;
pub mod delay;
pub mod envelope;
pub mod filter;
pub mod noise;
pub mod oscillator;
pub mod parameter;
pub mod reverb;
pub mod sequencer;
pub mod vca;

use futures::StreamExt;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use self::{
    clock::{clock, ClockCommand, ClockParams},
    delay::{delay, DelayCommand, DelayParams},
    envelope::{envelope, EnvelopeCommand, EnvelopeParams},
    filter::{filter, FilterCommand, FilterParams},
    noise::noise,
    oscillator::{oscillator, OscillatorCommand, OscillatorParams},
    parameter::{parameter, ParameterCommand, ParameterParams},
    reverb::{reverb, ReverbCommand, ReverbParams},
    sequencer::{sequencer, SequencerCommand, SequencerEvent, SequencerParams},
    vca::{vca, VcaCommand, VcaParams},
};
use crate::{
    context::{GeneralContext, ModuleContext},
    utils::observer::Observable,
};

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
    // Quantiser(QuantiserNode),
    Reverb(ReverbParams),
    // SampleAndHold(SampleAndHoldNode),
    // Sampler(SamplerNode),
    Sequencer(SequencerParams),
    // Sum(SumNode),
    Vca(VcaParams),
}

#[derive(Serialize, Deserialize, TryInto, Clone)]
pub enum AudioModuleCommand {
    Sequencer(SequencerCommand),
    Clock(ClockCommand),
    Delay(DelayCommand),
    Envelope(EnvelopeCommand),
    Filter(FilterCommand),
    Oscillator(OscillatorCommand),
    Parameter(ParameterCommand),
    Reverb(ReverbCommand),
    Vca(VcaCommand),

    #[serde(skip)]
    NoOp(NoOp),
}

#[derive(Serialize, Deserialize, From, Clone)]
pub enum AudioModuleEvent {
    Sequencer(SequencerEvent),

    #[serde(skip)]
    NoOp(NoOp),
}

pub type ModuleUnit = Box<dyn AudioUnit32 + Send>;

impl From<AudioModuleType> for (ModuleUnit, GeneralContext) {
    fn from(node_type: AudioModuleType) -> Self {
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
        }
    }
}

/// Placeholder type used to represent no-op event or command
#[derive(Clone)]
pub struct NoOp;
