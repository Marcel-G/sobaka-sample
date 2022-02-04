use dasp::graph::{Buffer, Input, Node};

use enum_map::Enum;
use freeverb::Freeverb;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use crate::util::input::{filter_inputs, summed};

#[derive(Clone, Enum, PartialEq, Eq, Hash, Serialize, Deserialize, JsonSchema)]
pub enum ReverbInput {
    Signal,
    Dampening,
    Wet,
    Width,
    Dry,
    RoomSize,
}

pub struct ReverbNode(Freeverb);

impl Default for ReverbNode {
    fn default() -> Self {
        Self(freeverb::Freeverb::new(44100))
    }
}

impl ReverbNode {
    pub fn set_dampening(&mut self, value: f64) {
        self.0.set_dampening(value)
    }

    pub fn set_freeze(&mut self, value: bool) {
        self.0.set_freeze(value)
    }

    pub fn set_wet(&mut self, value: f64) {
        self.0.set_wet(value)
    }

    pub fn set_width(&mut self, value: f64) {
        self.0.set_width(value)
    }

    pub fn set_dry(&mut self, value: f64) {
        self.0.set_dry(value)
    }

    pub fn set_room_size(&mut self, value: f64) {
        self.0.set_room_size(value)
    }
}

impl Node for ReverbNode {
    type InputType = ReverbInput;
    fn process(&mut self, inputs: &[Input<Self::InputType>], output: &mut [Buffer]) {
        let signal = summed(&filter_inputs(inputs, &ReverbInput::Signal));
        let dampening = summed(&filter_inputs(inputs, &ReverbInput::Dampening));
        let wet = summed(&filter_inputs(inputs, &ReverbInput::Wet));
        let width = summed(&filter_inputs(inputs, &ReverbInput::Width));
        let dry = summed(&filter_inputs(inputs, &ReverbInput::Dry));
        let room_size = summed(&filter_inputs(inputs, &ReverbInput::RoomSize));
        for ix in 0..Buffer::LEN {
            self.set_dampening(dampening[ix].into());
            self.set_wet(wet[ix].into());
            self.set_width(width[ix].into());
            self.set_dry(dry[ix].into());
            self.set_room_size(room_size[ix].into());
            // Mono reverb - @todo include right channel
            let (left, _) = self.0.tick((signal[ix].into(), 0.0));
            output[0][ix] = left as f32;
        }
    }
}
