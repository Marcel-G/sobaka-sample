use dasp::{
    graph::{Buffer, Input, Node},
    interpolate::{sinc::Sinc, Interpolator},
    ring_buffer::{Bounded, Fixed},
};
use serde::{Deserialize, Serialize};
use strum_macros::IntoStaticStr;
use ts_rs::TS;

use crate::{
    graph::InputId,
    util::input::{filter_inputs, summed},
};

pub struct DelayNode {
    buffer: Bounded<Vec<f32>>,
    interpolator: Sinc<[f32; 16]>,
    interpolation_value: f32,
    sample_rate: f64,
}

impl DelayNode {
    pub fn new(sample_rate: f64) -> Self {
        let frames = Fixed::from([0.0; 16]);
        let interpolator = Sinc::new(frames);
        Self {
            sample_rate,
            buffer: Bounded::from(vec![0.0; 44100 * 10]),
            interpolator,
            interpolation_value: 0.0,
        }
    }
}

#[derive(Clone, PartialEq, Eq, Hash, Serialize, Deserialize, TS, IntoStaticStr)]
#[ts(export)]
pub enum DelayInput {
    Time,
    Signal,
}

impl Node<InputId> for DelayNode {
    fn process(&mut self, inputs: &[Input<InputId>], output: &mut [Buffer]) {
        let input = summed(&filter_inputs(inputs, DelayInput::Signal));
        let delay = summed(&filter_inputs(inputs, DelayInput::Time));

        for ((out, d), dry) in output
            .get_mut(0)
            .unwrap()
            .iter_mut()
            .zip(delay.iter())
            .zip(input.iter())
        {
            let source_length = self.buffer.len() as f32;

            self.buffer.push(*dry);

            while self.interpolation_value >= 1.0 {
                self.interpolator
                    .next_source_frame(self.buffer.pop().unwrap_or(0.0));
                self.interpolation_value -= 1.0;
            }

            *out = self
                .interpolator
                .interpolate(self.interpolation_value.into());

            let target_length = d.clamp(0.0, 10.0) * self.sample_rate as f32;
            let consume = source_length - target_length;
            let ratio = 4.0_f32.powf((consume / 10000.0).clamp(-1.0, 1.0));

            self.interpolation_value += ratio;
        }
    }
}
