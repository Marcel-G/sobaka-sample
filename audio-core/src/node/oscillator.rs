use dasp::{
    graph::{BoxedNodeSend, Buffer, Input, Node},
    signal, Sample, Signal,
};
use enum_map::Enum;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use crate::util::input_signal::InputSignalNode;

use super::StatefulNode;

const SAMPLE_RATE: f64 = 44100.;

#[derive(Clone, Enum, PartialEq, Eq, Hash, Serialize, Deserialize, JsonSchema)]
pub enum OscillatorInput {
    Frequency,
}

#[derive(PartialEq, Clone, Serialize, Deserialize, JsonSchema)]
pub enum OscillatorWave {
    Saw,
    Square,
    Sine,
    Noise,
}

impl Default for OscillatorWave {
    fn default() -> Self {
        OscillatorWave::Sine
    }
}

#[derive(Default, Serialize, Deserialize, JsonSchema)]
pub struct OscillatorState {
    wave: OscillatorWave,
}
pub struct OscillatorNode {
    wave: BoxedNodeSend<OscillatorInput>,
}

impl OscillatorNode {
    fn create_sine() -> BoxedNodeSend<OscillatorInput> {
        let node = InputSignalNode::new(|s| {
            signal::rate(SAMPLE_RATE)
                .hz(s.input(OscillatorInput::Frequency))
                .sine()
                .map(Sample::to_sample::<f32>)
        });

        BoxedNodeSend::new(node)
    }

    fn create_saw() -> BoxedNodeSend<OscillatorInput> {
        let node = InputSignalNode::new(|s| {
            signal::rate(SAMPLE_RATE)
                .hz(s.input(OscillatorInput::Frequency))
                .saw()
                .map(Sample::to_sample::<f32>)
        });

        BoxedNodeSend::new(node)
    }

    fn create_square() -> BoxedNodeSend<OscillatorInput> {
        let node = InputSignalNode::new(|s| {
            signal::rate(SAMPLE_RATE)
                .hz(s.input(OscillatorInput::Frequency))
                .square()
                .map(Sample::to_sample::<f32>)
        });

        BoxedNodeSend::new(node)
    }

    fn create_noise() -> BoxedNodeSend<OscillatorInput> {
        let node = InputSignalNode::new(|s| {
            signal::rate(SAMPLE_RATE)
                .hz(s.input(OscillatorInput::Frequency))
                .noise_simplex()
                .map(Sample::to_sample::<f32>)
        });

        BoxedNodeSend::new(node)
    }
}

impl StatefulNode for OscillatorNode {
    type State = OscillatorState;

    fn create(state: Self::State) -> Self {
        let wave = match state.wave {
            OscillatorWave::Saw => Self::create_saw(),
            OscillatorWave::Square => Self::create_square(),
            OscillatorWave::Sine => Self::create_sine(),
            OscillatorWave::Noise => Self::create_noise(),
        };

        Self { wave }
    }

    fn update(&mut self, state: Self::State) {
        self.wave = match state.wave {
            OscillatorWave::Saw => Self::create_saw(),
            OscillatorWave::Square => Self::create_square(),
            OscillatorWave::Sine => Self::create_sine(),
            OscillatorWave::Noise => Self::create_noise(),
        }
    }
}

impl Default for OscillatorNode {
    fn default() -> Self {
        Self {
            wave: Self::create_sine(),
        }
    }
}

impl Node for OscillatorNode {
    type InputType = OscillatorInput;

    fn process(&mut self, inputs: &[Input<Self::InputType>], output: &mut [Buffer]) {
        self.wave.process(inputs, output)
    }
}
