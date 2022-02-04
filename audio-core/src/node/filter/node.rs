use dasp::{
    graph::{BoxedNodeSend, Buffer, Input, Node},
    signal, Sample, Signal,
};
use enum_map::Enum;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use crate::{
    node::StatefulNode,
    util::{filtered_signal::SignalFilter, input_signal::InputSignalNode},
};

use super::filters::{BandPass, HighPass, LowPass, Peak};

#[derive(PartialEq, Clone, Serialize, Deserialize, JsonSchema)]
pub enum FilterKind {
    HighPass,
    LowPass,
    BandPass,
    Peak,
}

#[derive(Serialize, Deserialize, JsonSchema)]
pub struct FilterState {
    kind: FilterKind,
}

#[derive(PartialEq, Eq, Hash, Clone, Enum, Serialize, Deserialize, JsonSchema)]
pub enum FilterInput {
    Signal,
    Frequency,
    Q,
}

/// Using 1v/oct seems to be a good idea
fn voltage_to_frequency(voltage: f64) -> f64 {
    16.35 * 2.0_f64.powf(voltage)
}

pub struct FilterNode {
    filter: BoxedNodeSend<FilterInput>,
    sample_rate: f64,
}

impl FilterNode {
    fn create_high_pass(sample_rate: f64) -> BoxedNodeSend<FilterInput> {
        let node = InputSignalNode::new(|s| {
            s.input(FilterInput::Signal)
                .filtered(HighPass::new(
                    s.input(FilterInput::Frequency).map(voltage_to_frequency),
                    s.input(FilterInput::Q)
                        .map(|g| g.clamp(f64::MIN_POSITIVE, 1.0)),
                    sample_rate,
                ))
                .map(Sample::to_sample::<f32>)
        });

        BoxedNodeSend::new(node)
    }

    fn create_low_pass(sample_rate: f64) -> BoxedNodeSend<FilterInput> {
        let node = InputSignalNode::new(|s| {
            s.input(FilterInput::Signal)
                .filtered(LowPass::new(
                    s.input(FilterInput::Frequency).map(voltage_to_frequency),
                    s.input(FilterInput::Q)
                        .map(|g| g.clamp(f64::MIN_POSITIVE, 1.0)),
                    sample_rate,
                ))
                .map(Sample::to_sample::<f32>)
        });

        BoxedNodeSend::new(node)
    }

    fn create_band_pass(sample_rate: f64) -> BoxedNodeSend<FilterInput> {
        let node = InputSignalNode::new(|s| {
            s.input(FilterInput::Signal)
                .filtered(BandPass::new(
                    s.input(FilterInput::Frequency).map(voltage_to_frequency),
                    s.input(FilterInput::Q)
                        .map(|g| g.clamp(f64::MIN_POSITIVE, 1.0)),
                    sample_rate,
                ))
                .map(Sample::to_sample::<f32>)
        });

        BoxedNodeSend::new(node)
    }

    fn create_peak(sample_rate: f64) -> BoxedNodeSend<FilterInput> {
        let node = InputSignalNode::new(|s| {
            s.input(FilterInput::Signal)
                .filtered(Peak::new(
                    s.input(FilterInput::Frequency).map(voltage_to_frequency),
                    s.input(FilterInput::Q)
                        .map(|g| g.clamp(f64::MIN_POSITIVE, 1.0)),
                    signal::gen(|| 0.0),
                    sample_rate,
                ))
                .map(Sample::to_sample::<f32>)
        });

        BoxedNodeSend::new(node)
    }
}

impl StatefulNode for FilterNode {
    type State = FilterState;

    fn create(state: Self::State, sample_rate: f64) -> Self {
        let filter = match state.kind {
            FilterKind::HighPass => Self::create_high_pass(sample_rate),
            FilterKind::LowPass => Self::create_low_pass(sample_rate),
            FilterKind::BandPass => Self::create_band_pass(sample_rate),
            FilterKind::Peak => Self::create_peak(sample_rate),
        };

        Self {
            filter,
            sample_rate,
        }
    }

    fn update(&mut self, state: Self::State) {
        self.filter = match state.kind {
            FilterKind::HighPass => Self::create_high_pass(self.sample_rate),
            FilterKind::LowPass => Self::create_low_pass(self.sample_rate),
            FilterKind::BandPass => Self::create_band_pass(self.sample_rate),
            FilterKind::Peak => Self::create_peak(self.sample_rate),
        }
    }
}

impl Node for FilterNode {
    type InputType = FilterInput;

    fn process(&mut self, inputs: &[Input<Self::InputType>], output: &mut [Buffer]) {
        self.filter.process(inputs, output)
    }
}
