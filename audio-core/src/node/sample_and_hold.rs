use dasp::graph::{Buffer, Input, Node};

use serde::{Deserialize, Serialize};
use strum_macros::IntoStaticStr;
use ts_rs::TS;

use crate::{
    graph::InputId,
    util::input::{filter_inputs, summed},
};

#[derive(Clone, Serialize, Deserialize, TS, IntoStaticStr)]
#[ts(export)]
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

impl Node<InputId> for SampleAndHoldNode {
    fn process(&mut self, inputs: &[Input<InputId>], output: &mut [Buffer]) {
        let signal = summed(&filter_inputs(inputs, SampleAndHoldInput::Signal));
        let gate = summed(&filter_inputs(inputs, SampleAndHoldInput::Gate));

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
