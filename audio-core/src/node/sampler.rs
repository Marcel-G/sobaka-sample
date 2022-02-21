use std::default;

use dasp::{
    graph::{Buffer, Input, Node},
    interpolate::{sinc::Sinc, Interpolator},
    ring_buffer::Fixed,
};
use serde::{Deserialize, Serialize};
use strum_macros::IntoStaticStr;
use ts_rs::TS;

use crate::{
    graph::InputId,
    util::input::{filter_inputs, summed},
};

use super::StatefulNode;

#[derive(Default, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct SamplerState {
    pub data: Option<Vec<f32>>,
    pub sample_rate: f32,
}

pub struct SamplerNode {
    interpolator: Sinc<[f32; 16]>,
    interpolation_value: f32,
    is_rising: bool,
    current_sample: usize,
    state: SamplerState,
    sample_rate: f64, // @todo can the context have a different sample_rate to the data provided
}

#[derive(Clone, Serialize, Deserialize, TS, IntoStaticStr)]
#[ts(export)]
pub enum SamplerInput {
    Gate,
    Start,
    Length,
    Speed,
}

impl SamplerNode {
    pub fn new(state: SamplerState, sample_rate: f64) -> Self {
        let frames = Fixed::from([0.0; 16]);
        let interpolator = Sinc::new(frames);
        Self {
            interpolator,
            interpolation_value: 0.0,
            is_rising: false,
            current_sample: 0,
            state,
            sample_rate,
        }
    }

    pub fn update(&mut self, state: SamplerState) {
        // Ignore data if it's not provided
        if let Some(data) = state.data {
            self.state.data = Some(data)
        }
    }
}

impl Node<InputId> for SamplerNode {
    fn process(&mut self, inputs: &[Input<InputId>], output: &mut [Buffer]) {
        if let Some(data) = &self.state.data {
            let gate = summed(&filter_inputs(inputs, SamplerInput::Gate));
            let start = summed(&filter_inputs(inputs, SamplerInput::Start));
            let length = summed(&filter_inputs(inputs, SamplerInput::Length));
            let speed = summed(&filter_inputs(inputs, SamplerInput::Speed));

            for ix in 0..Buffer::LEN {
                if gate[ix] >= 1.0 {
                    if !self.is_rising {
                        self.current_sample = 0;
                        self.is_rising = true;
                    }
                } else {
                    self.is_rising = false
                }

                let s = (start[ix].clamp(0.0, 1.0) * data.len() as f32).floor() as usize;
                let l = (length[ix].clamp(0.0, 1.0) * (data.len() - s) as f32).floor() as usize;
                let slice = &data[s..(s + l)];

                while self.interpolation_value >= 1.0 {
                    self.interpolator
                        .next_source_frame(*slice.get(self.current_sample).unwrap_or(&0.0));
                    self.interpolation_value -= 1.0;
                    self.current_sample += 1
                }

                output[0][ix] = self
                    .interpolator
                    .interpolate(self.interpolation_value.into());

                self.interpolation_value += speed[ix];
            }
        } else {
            for out_buffer in output.iter_mut() {
                out_buffer.silence();
            }
        }
    }
}

impl StatefulNode for SamplerNode {
    type State = SamplerState;

    fn create(state: Self::State, sample_rate: f64) -> Self {
        Self::new(state, sample_rate)
    }

    fn update(&mut self, state: Self::State) {
        self.update(state)
    }
}
