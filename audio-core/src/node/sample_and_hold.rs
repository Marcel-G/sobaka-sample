use dasp::graph::{Buffer, Input, Node};

use enum_map::Enum;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use crate::util::input::{filter_inputs, summed};

#[derive(Clone, Enum, PartialEq, Eq, Hash, Serialize, Deserialize, JsonSchema)]
pub enum SampleAndHoldInput {
    Signal,
    Gate,
}

pub struct SampleAndHoldNode {
    is_rising: bool,
    sample: f32,
}

impl Default for SampleAndHoldNode {
    fn default() -> Self {
        Self {
            is_rising: false,
            sample: 0.0,
        }
    }
}

impl Node for SampleAndHoldNode {
    type InputType = SampleAndHoldInput;

    fn process(&mut self, inputs: &[Input<Self::InputType>], output: &mut [Buffer]) {
        let signal = summed(&filter_inputs(inputs, &SampleAndHoldInput::Signal));
        let gate = summed(&filter_inputs(inputs, &SampleAndHoldInput::Gate));

        for ix in 0..Buffer::LEN {
            if gate[ix] >= 1.0 {
                if !self.is_rising {
                    self.sample = signal[ix];
                    self.is_rising = true;
                }
            } else {
                self.is_rising = false
            }
            output[0][ix] = self.sample
        }
    }
}
