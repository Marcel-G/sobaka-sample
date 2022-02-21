use dasp::{
    graph::{BoxedNodeSend, Buffer, Input, Node},
    signal, Sample, Signal,
};
use serde::{Deserialize, Serialize};
use strum_macros::{EnumIter, IntoStaticStr};
use ts_rs::TS;

use crate::{graph::InputId, util::input_signal::InputSignalNode};

use super::StatefulNode;

#[derive(Clone, Serialize, Deserialize, TS, IntoStaticStr, EnumIter)]
#[ts(export)]
pub enum OscillatorInput {
    Frequency,
}

#[derive(PartialEq, Clone, Serialize, Deserialize, TS)]
#[ts(export)]
pub enum OscillatorWave {
    Clock,
    Lfo,
    Saw,
    Sine,
    Square,
}

impl Default for OscillatorWave {
    fn default() -> Self {
        OscillatorWave::Sine
    }
}

/// Using 1v/oct seems to be a good idea
fn voltage_to_frequency(voltage: f64) -> f64 {
    16.35 * 2.0_f64.powf(voltage)
}

#[derive(Default, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct OscillatorState {
    wave: OscillatorWave,
}
pub struct OscillatorNode {
    wave: BoxedNodeSend<InputId>,
    sample_rate: f64,
}

impl OscillatorNode {
    fn create_clock(sample_rate: f64) -> BoxedNodeSend<InputId> {
        let node = InputSignalNode::<OscillatorInput, _>::new(|s| {
            signal::rate(sample_rate)
                .hz(s.input(OscillatorInput::Frequency))
                .square()
                .map(Sample::to_sample::<f32>)
        });

        BoxedNodeSend::new(node)
    }
    fn create_lfo(sample_rate: f64) -> BoxedNodeSend<InputId> {
        let node = InputSignalNode::<OscillatorInput, _>::new(|s| {
            signal::rate(sample_rate)
                .hz(s.input(OscillatorInput::Frequency))
                .sine()
                .map(Sample::to_sample::<f32>)
        });

        BoxedNodeSend::new(node)
    }
    fn create_sine(sample_rate: f64) -> BoxedNodeSend<InputId> {
        let node = InputSignalNode::<OscillatorInput, _>::new(|s| {
            signal::rate(sample_rate)
                .hz(s
                    .input(OscillatorInput::Frequency)
                    .map(voltage_to_frequency))
                .sine()
                .map(Sample::to_sample::<f32>)
        });

        BoxedNodeSend::new(node)
    }

    fn create_saw(sample_rate: f64) -> BoxedNodeSend<InputId> {
        let node = InputSignalNode::<OscillatorInput, _>::new(|s| {
            signal::rate(sample_rate)
                .hz(s
                    .input(OscillatorInput::Frequency)
                    .map(voltage_to_frequency))
                .saw()
                .map(Sample::to_sample::<f32>)
        });

        BoxedNodeSend::new(node)
    }

    fn create_square(sample_rate: f64) -> BoxedNodeSend<InputId> {
        let node = InputSignalNode::<OscillatorInput, _>::new(|s| {
            signal::rate(sample_rate)
                .hz(s
                    .input(OscillatorInput::Frequency)
                    .map(voltage_to_frequency))
                .square()
                .map(Sample::to_sample::<f32>)
        });

        BoxedNodeSend::new(node)
    }
}

impl StatefulNode for OscillatorNode {
    type State = OscillatorState;

    fn create(state: Self::State, sample_rate: f64) -> Self {
        let wave = match state.wave {
            OscillatorWave::Clock => Self::create_clock(sample_rate),
            OscillatorWave::Lfo => Self::create_lfo(sample_rate),
            OscillatorWave::Saw => Self::create_saw(sample_rate),
            OscillatorWave::Sine => Self::create_sine(sample_rate),
            OscillatorWave::Square => Self::create_square(sample_rate),
        };

        Self { wave, sample_rate }
    }

    fn update(&mut self, state: Self::State) {
        self.wave = match state.wave {
            OscillatorWave::Clock => Self::create_clock(self.sample_rate),
            OscillatorWave::Lfo => Self::create_lfo(self.sample_rate),
            OscillatorWave::Saw => Self::create_saw(self.sample_rate),
            OscillatorWave::Sine => Self::create_sine(self.sample_rate),
            OscillatorWave::Square => Self::create_square(self.sample_rate),
        }
    }
}

impl Node<InputId> for OscillatorNode {
    fn process(&mut self, inputs: &[Input<InputId>], output: &mut [Buffer]) {
        self.wave.process(inputs, output)
    }
}
