use fundsp::hacker32::*;
pub mod clock;
pub mod envelope;
pub mod filter;
pub mod noise;
pub mod oscillator;
pub mod parameter;
pub mod reverb;
pub mod sequencer;
pub mod vca;

use fundsp::hacker::AudioUnit32;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use self::{
    clock::{clock, ClockParams},
    filter::{filter, FilterParams},
    oscillator::{oscillator, OscillatorParams},
    parameter::{parameter, ParameterParams},
    reverb::{reverb, ReverbParams},
    sequencer::{sequencer, SequencerParams},
    vca::{vca, VcaParams},
    envelope::{ envelope, EnvelopeParams },
    noise::{ noise },
};
use crate::interface::message::SobakaMessage;

#[derive(Serialize, Deserialize, TS)]
#[serde(tag = "node_type", content = "data")]
#[ts(export)]
pub enum AudioModuleType {
    // Delay(DelayNode),
    Envelope(EnvelopeParams),
    // Input(InputNode),
    // Midi(MidiNode),
    // Filter(FilterNode),
    Filter(FilterParams),
    Clock(ClockParams),
    Noise,
    Parameter(ParameterParams),
    Oscillator(OscillatorParams),
    // Parameter(ParameterNode),
    // Quantiser(QuantiserNode),
    Reverb(ReverbParams),
    // SampleAndHold(SampleAndHoldNode),
    // Sampler(SamplerNode),
    Sequencer(SequencerParams),
    // Sum(SumNode),
    Vca(VcaParams)
}

impl From<AudioModuleType> for Box<dyn AudioModule32 + Send> {
    fn from(node_type: AudioModuleType) -> Self {
        match node_type {
            AudioModuleType::Oscillator(params) => Box::new(oscillator(params)),
            AudioModuleType::Parameter(params) => Box::new(parameter(params)),
            AudioModuleType::Reverb(params) => Box::new(reverb(params)),
            AudioModuleType::Filter(params) => Box::new(filter(params)),
            AudioModuleType::Clock(params) => Box::new(clock(params)),
            AudioModuleType::Sequencer(params) => Box::new(sequencer(params)),
            AudioModuleType::Vca(params) => Box::new(vca(params)),
            AudioModuleType::Envelope(params) => Box::new(envelope(params)),
            AudioModuleType::Noise => Box::new(noise()),
        }
    }
}

pub fn module<U, F>(unit: An<U>, message_fn: F) -> Mod<U, F>
where
    U: AudioNode<Sample = f32>,
    F: Fn(&mut U, SobakaMessage),
{
    Mod { unit, message_fn }
}

pub struct Mod<U, F>
where
    U: AudioNode<Sample = f32>,
    F: Fn(&mut U, SobakaMessage),
{
    unit: An<U>,
    message_fn: F,
}

pub trait AudioModule32: AudioUnit32 {
    fn on_message(&mut self, message: SobakaMessage);
}

impl<U, F> AudioUnit32 for Mod<U, F>
where
    U: AudioNode<Sample = f32>,
    F: Fn(&mut U, SobakaMessage),
    U::Inputs: Size<f32>,
    U::Outputs: Size<f32>,
{
    fn reset(&mut self, sample_rate: Option<f64>) {
        self.unit.reset(sample_rate);
    }
    fn tick(&mut self, input: &[f32], output: &mut [f32]) {
        self.unit.tick(input, output);
    }
    fn process(&mut self, size: usize, input: &[&[f32]], output: &mut [&mut [f32]]) {
        self.unit.process(size, input, output);
    }
    fn inputs(&self) -> usize {
        self.unit.inputs()
    }
    fn outputs(&self) -> usize {
        self.unit.outputs()
    }
    fn get_id(&self) -> u64 {
        U::ID
    }
    fn set_hash(&mut self, hash: u64) {
        self.unit.set_hash(hash);
    }
    fn ping(&mut self, probe: bool, hash: AttoRand) -> AttoRand {
        self.unit.ping(probe, hash)
    }
    fn route(&self, input: &SignalFrame, frequency: f64) -> SignalFrame {
        self.unit.route(input, frequency)
    }
    fn set(&mut self, parameter: Tag, value: f64) {
        self.unit.set(parameter, value);
    }
    fn get(&self, parameter: Tag) -> Option<f64> {
        self.unit.get(parameter)
    }
}

impl<U, F> AudioModule32 for Mod<U, F>
where
    U: AudioNode<Sample = f32>,
    F: Fn(&mut U, SobakaMessage),
{
    fn on_message(&mut self, message: SobakaMessage) {
        (self.message_fn)(&mut self.unit, message)
    }
}
