use dasp::graph::{Buffer, Input, Node};

use enum_map::Enum;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use crate::util::input::{filter_inputs, summed};

use super::StatefulNode;

#[derive(Clone, Enum, PartialEq, Eq, Hash, Serialize, Deserialize, JsonSchema)]
pub enum QuantiserInput {
    Pitch,
}

#[derive(Default, Serialize, Deserialize, JsonSchema)]
pub struct QuantiserState {
    notes: [bool; 12],
}

pub struct QuantiserNode([i32; 24]);

impl StatefulNode for QuantiserNode {
    type State = QuantiserState;

    fn create(state: Self::State, _sample_rate: f64) -> Self {
        let ranges = Self::create_ranges(state.notes);
        Self(ranges)
    }

    fn update(&mut self, state: Self::State) {
        self.0 = Self::create_ranges(state.notes)
    }
}

impl QuantiserNode {
    fn create_ranges(notes: [bool; 12]) -> [i32; 24] {
        let mut ranges = [0; 24];

        for (i, range) in ranges.iter_mut().enumerate() {
            let mut closest_note = 0;
            let mut closest_dist = i32::MAX;

            for note in -12..24 {
                let dist = ((i as i32 + 1) / 2 - note).abs();
                if !notes[(note % 12).abs() as usize] {
                    continue;
                }
                if dist < closest_dist {
                    closest_note = note;
                    closest_dist = dist;
                } else {
                    break;
                }
            }

            *range = closest_note;
        }
        ranges
    }
}

impl Node for QuantiserNode {
    type InputType = QuantiserInput;

    fn process(&mut self, inputs: &[Input<Self::InputType>], output: &mut [Buffer]) {
        let pitch = summed(&filter_inputs(inputs, &QuantiserInput::Pitch));

        for ix in 0..Buffer::LEN {
            let range = (pitch[ix] * 24.0).floor() as usize;
            let octave = range / 24;
            let index = range - octave * 24;
            let note = self.0[index] + octave as i32 * 12;
            output[0][ix] = note as f32 / 12.0;
        }
    }
}
