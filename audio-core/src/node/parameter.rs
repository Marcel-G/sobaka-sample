use dasp::{
    graph::{Buffer, Input, Node},
    Signal,
};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use super::StatefulNode;

pub struct ParameterNode {
    pub range: (f32, f32),
    pub value: f32,
    current_value: f32,
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
        if (self.current_value - self.value).abs() > 0.005 {
            self.current_value += (self.value - self.current_value) * 0.25;
        } else {
            self.current_value = self.value;
        }

        self.current_value
    }
}

impl Node for ParameterNode {
    type InputType = ();
    fn process(&mut self, inputs: &[Input<Self::InputType>], output: &mut [Buffer]) {
        (self as &mut (dyn Signal<Frame = f32> + Send)).process(inputs, output)
    }
}

impl StatefulNode for ParameterNode {
    type State = ParameterState;

    fn create(state: Self::State) -> Self {
        Self::new(state)
    }

    fn update(&mut self, state: Self::State) {
        self.update(state)
    }
}
