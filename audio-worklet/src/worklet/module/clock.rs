use fundsp::prelude::*;
use wasm_worklet::types::{AudioModule, ParamMap};

wasm_worklet::derive_param! {
    pub enum ClockParams {
        #[param(
            automation_rate = "a-rate",
            min_value = 0.,
            max_value = 600.,
            default_value = 120.
        )]
        Bpm,
    }
}

pub struct Clock {
    inner: Box<dyn AudioUnit32>,
}

impl AudioModule for Clock {
    type Param = ClockParams;

    const INPUTS: u32 = 1;
    const OUTPUTS: u32 = 5;

    fn create() -> Self {
        let module = {
            let clock_square = || sine() >> map(|f| if f[0] > 0.0 { 1.0 } else { -1.0 });

            let divide = [1.0, 2.0, 4.0, 8.0, 16.0];

            let clock_divider_node =
                branch::<U5, _, _, _>(|n| mul(divide[n as usize]) >> clock_square());

            let bpm = (pass() + tag(ClockParams::Bpm as i64, 0.0)) >> map(|f| bpm_hz(f[0]));

            bpm >> clock_divider_node
        };

        Clock {
            inner: Box::new(module),
        }
    }

    fn process(
        &mut self,
        inputs: &[&[[f32; 128]]],
        outputs: &mut [&mut [[f32; 128]]],
        params: &ParamMap<Self::Param>,
    ) {
        for i in 0..128 {
            // Write all the paramaters into the AudioUnit. Usually, these will be the same value.
            // Could possibly distinguish between a-rate / k-rate here
            for (param, buffer) in params.iter() {
                self.inner
                    .set(param as i64, *buffer.as_ref().get(i).unwrap() as f64);
            }

            let input_frame: Vec<_> = inputs
                .iter()
                // @todo hardcoded channel one - maybe flatten?
                .map(|channel| channel[0][i])
                .collect();

            let mut output_frame = vec![0.0; outputs.len()]; // @todo assuming single channel

            self.inner.tick(&input_frame, &mut output_frame);

            // We move the data from the frame buffer into the planar buffer after processing.
            for (channel, frame) in outputs.iter_mut().zip(output_frame) {
                // @todo assuming single channel
                channel[0][i] = frame
            }
        }
    }
}

wasm_worklet::module!(Clock);
