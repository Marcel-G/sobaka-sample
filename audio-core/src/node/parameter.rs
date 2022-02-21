use dasp::{
    graph::{Buffer, Input, Node},
    Frame, Signal,
};
use serde::{Deserialize, Serialize};
use strum_macros::IntoStaticStr;
use ts_rs::TS;

use crate::{
    graph::InputId,
    util::input::{filter_inputs, summed},
};

use super::StatefulNode;

pub struct ParameterNode {
    pub range: (f32, f32),
    pub value: f32,
    current_value: f32,
}

#[derive(Clone, PartialEq, Eq, Hash, Serialize, Deserialize, TS, IntoStaticStr)]
#[ts(export)]
pub enum ParameterInput {
    Cv,
}

#[derive(Default, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ParameterState {
    pub range: (f32, f32),
    pub value: f32,
}

impl ParameterNode {
    pub fn new(state: ParameterState) -> Self {
        let range = state.range;
        Self {
            value: state.value.clamp(range.0, range.1),
            current_value: 0.0,
            range,
        }
    }

    pub fn update(&mut self, state: ParameterState) {
        let value = state.value;
        self.range = state.range;
        self.value = value.clamp(self.range.0, self.range.1);
    }
}

impl Signal for ParameterNode {
    type Frame = f32;

    fn next(&mut self) -> Self::Frame {
        if self.current_value != self.value {
            let diff = self.value - self.current_value;
            if diff.abs() < 1. / 2000. {
                self.current_value = self.value
            } else {
                self.current_value += diff / 2000.;
            }
        }
        self.current_value
    }
}

impl Node<InputId> for ParameterNode {
    fn process(&mut self, inputs: &[Input<InputId>], output: &mut [Buffer]) {
        let control = summed(&filter_inputs(inputs, ParameterInput::Cv));
        for ix in 0..Buffer::LEN {
            let frame = self.next() + control[ix];
            output[0][ix] = unsafe { *frame.channel_unchecked(0) };
        }
    }
}

impl StatefulNode for ParameterNode {
    type State = ParameterState;

    fn create(state: Self::State, _sample_rate: f64) -> Self {
        Self::new(state)
    }

    fn update(&mut self, state: Self::State) {
        self.update(state)
    }
}
