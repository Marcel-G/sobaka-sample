use crate::{
    dsp::{
        oscillator::{sobaka_saw, sobaka_square, sobaka_triangle},
        trigger::reset_trigger,
        volt_hz,
    },
    fundsp_worklet::FundspWorklet,
};
use fundsp::prelude::*;
use waw::{
    buffer::{AudioBuffer, ParamBuffer},
    worklet::{AudioModule, Emitter},
};

#[waw::derive::derive_param]
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
    Triangle,
}

pub struct Oscillator {
    inner: FundspWorklet,
}

impl AudioModule for Oscillator {
    type Param = OscillatorParams;

    const INPUTS: u32 = 2;
    const OUTPUTS: u32 = 1;

    fn create(emitter: Emitter<Self::Event>) -> Self {
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
            inner: FundspWorklet::create(module),
        }
    }
    fn process(&mut self, audio: &mut AudioBuffer, params: &ParamBuffer<Self::Param>) {
        self.inner.process(audio, params);
    }
}

waw::main!(Oscillator);
