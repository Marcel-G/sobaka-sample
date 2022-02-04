use dasp::{
    graph::{Buffer, Input, Node},
    Frame, Signal,
};
use enum_map::Enum;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use crate::util::input::{filter_inputs, summed};

use super::StatefulNode;

pub struct ParameterNode {
    pub range: (f32, f32),
    pub value: f32,
    current_value: f32,
}

#[derive(Clone, Enum, PartialEq, Eq, Hash, Serialize, Deserialize, JsonSchema)]
pub enum ParameterInput {
    Cv,
}

#[derive(Default, Serialize, Deserialize, JsonSchema)]
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
        self.current_value += (self.value - self.current_value) / 2000.;

        self.current_value
    }
}

impl Node for ParameterNode {
    type InputType = ParameterInput;
    fn process(&mut self, inputs: &[Input<Self::InputType>], output: &mut [Buffer]) {
        let control = summed(&filter_inputs(inputs, &ParameterInput::Cv));
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
