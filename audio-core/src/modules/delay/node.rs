use dasp::{
    graph::{Buffer, Input, Node},
    interpolate::{sinc::Sinc, Interpolator},
    ring_buffer::{Bounded, Fixed},
};

const SAMPLE_RATE: f64 = 44100.;

pub struct DelayNode {
    buffer: Bounded<Vec<f32>>,
    interpolator: Sinc<[f32; 64]>,
    interpolation_value: f32,
}

impl Default for DelayNode {
    fn default() -> Self {
        Self::new()
    }
}

impl DelayNode {
    pub fn new() -> Self {
        let frames = Fixed::from([0.0; 64]);
        let interpolator = Sinc::new(frames);
        Self {
            buffer: Bounded::from(vec![0.0; 44100 * 10]),
            interpolator,
            interpolation_value: 0.0,
        }
    }
}

impl Node for DelayNode {
    fn process(&mut self, inputs: &[Input], output: &mut [Buffer]) {
        let input = match inputs.get(0) {
            Some(input) => input.buffers().get(0).unwrap(),
            None => return,
        };

        let delay = match inputs.get(1) {
            Some(delay) => delay.buffers().get(0).unwrap(),
            None => return,
        };

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

            let target_length = d.clamp(0.0, 10.0) * SAMPLE_RATE as f32;
            let consume = source_length - target_length;
            let ratio = 4.0_f32.powf((consume / 10000.0).clamp(-1.0, 1.0));

            self.interpolation_value += ratio;
        }
    }
}
