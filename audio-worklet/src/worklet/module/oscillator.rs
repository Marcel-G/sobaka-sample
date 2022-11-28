use crate::dsp::{
    oscillator::{sobaka_saw, sobaka_square, sobaka_triangle},
    trigger::reset_trigger,
    volt_hz,
};
use fundsp::prelude::*;
use wasm_worklet::{types::{AudioModule, ParamMap}};

wasm_worklet::derive_param! {
    pub enum OscillatorParams {
        #[param(
            automation_rate = "a-rate",
            min_value = 0.,
            max_value = 600.,
            default_value = 120.
        )]
        Pitch,
        #[param(
            automation_rate = "a-rate",
            min_value = 0.,
            max_value = 1.,
            default_value = 0.25
        )]
        Saw,
        #[param(
            automation_rate = "a-rate",
            min_value = 0.,
            max_value = 1.,
            default_value = 0.25
        )]
        Sine,
        #[param(
            automation_rate = "a-rate",
            min_value = 0.,
            max_value = 1.,
            default_value = 0.25
        )]
        Square,
        #[param(
            automation_rate = "a-rate",
            min_value = 0.,
            max_value = 1.,
            default_value = 0.25
        )]
        Triangle
    }
}

pub struct Oscillator {
    inner: Box<dyn AudioUnit32>,
}

impl AudioModule for Oscillator {
    type Param = OscillatorParams;

    const INPUTS: u32 = 2;
    const OUTPUTS: u32 = 1;

    fn create() -> Self {
        let module = {
            let multi_osc = {
                let input = split::<U2, _>()
                    >> ((pass() + tag(OscillatorParams::Pitch as i64, 0.0)) | pass())
                    >> (map::<_, _, U1, _>(|pitch| volt_hz(pitch[0])) | pass());
                let attenuated_saw = sobaka_saw() * tag(OscillatorParams::Saw as i64, 0.0);
                let attenuated_sine = sine_phase(0.0) * tag(OscillatorParams::Sine as i64, 0.0);
                let attenuated_square = sobaka_square() * tag(OscillatorParams::Square as i64, 0.0);
                let attenuated_triangle =
                    sobaka_triangle() * tag(OscillatorParams::Triangle as i64, 0.0);

                input
                    >> ((attenuated_saw & attenuated_sine & attenuated_square & attenuated_triangle)
                        | pass())
                    // if the pitch is 0, we'll just mute the output
                    >> map(|f| if f[1] > 0.0 { f[0] } else { 0.0 })
                    >> shape(Shape::Tanh(0.8))
            };

            reset_trigger(oversample(multi_osc))
        };

        Oscillator {
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

            assert!(
                input_frame.len() == self.inner.inputs(),
                "buffers = {}, inputs = {}",
                input_frame.len(),
                self.inner.inputs()
            );
            assert!(
                output_frame.len() == self.inner.outputs(),
                "buffers = {}, ouputs = {}",
                output_frame.len(),
                self.inner.outputs()
            );

            self.inner.tick(&input_frame, &mut output_frame);

            // We move the data from the frame buffer into the planar buffer after processing.
            for (channel, frame) in outputs.iter_mut().zip(output_frame) {
                // @todo assuming single channel
                channel[0][i] = frame
            }
        }
    }
}

wasm_worklet::module!(Oscillator);
