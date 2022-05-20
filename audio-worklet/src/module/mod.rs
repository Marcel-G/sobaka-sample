use fundsp::hacker32::*;
pub mod oscillator;
pub mod parameter;

use fundsp::hacker::AudioUnit32;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::interface::message::SobakaMessage;
use self::{oscillator::oscillator, parameter::parameter};

#[derive(Serialize, Deserialize, TS)]
pub enum AudioModuleType {
    // Delay(DelayNode),
    // Envelope(EnvelopeNode),
    // Input(InputNode),
    // Midi(MidiNode),
    // Filter(FilterNode),
    // Noise(NoiseNode),
    Parameter,
    Oscillator,
    // Parameter(ParameterNode),
    // Quantiser(QuantiserNode),
    // Reverb(ReverbNode),
    // SampleAndHold(SampleAndHoldNode),
    // Sampler(SamplerNode),
    // Sequencer(SequencerNode),
    // Sink(SinkNode),
    // Sum(SumNode),
    // Volume(VolumeNode)
}

impl From<AudioModuleType> for Box<dyn AudioModule32 + Send> {
    fn from(node_type: AudioModuleType) -> Self {
        match node_type {
            AudioModuleType::Oscillator => Box::new(oscillator()),
            AudioModuleType::Parameter => Box::new(parameter()),
        }
    }
}

pub fn module<U, F>(unit: An<U>, message_fn: F) -> Mod<U, F>
where
 U: AudioNode<Sample = f32>,
 F: Fn(&mut U, SobakaMessage) {
    Mod {
        unit,
        message_fn
    }
}

pub struct Mod<U, F>
where
 U: AudioNode<Sample = f32>,
 F: Fn(&mut U, SobakaMessage) {
    unit: An<U>,
    message_fn: F
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

impl <U, F> AudioModule32 for Mod<U, F>
where
 U: AudioNode<Sample = f32>,
 F: Fn(&mut U, SobakaMessage) {
    fn on_message(&mut self, message: SobakaMessage) {
        (self.message_fn)(&mut self.unit, message)
    }
}