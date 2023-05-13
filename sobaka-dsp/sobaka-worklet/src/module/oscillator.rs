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
    inner: FundspWorklet<OscillatorParams>,
}

impl AudioModule for Oscillator {
    type Param = OscillatorParams;

    const INPUTS: u32 = 2;
    const OUTPUTS: u32 = 1;

    fn create(_init: Option<Self::InitialState>, _emitter: Emitter<Self::Event>) -> Self {
        let param_storage = FundspWorklet::create_param_storage();

        let module = {
            let multi_osc = {
                let input = split::<U2, _>()
                    >> ((pass() + var(&param_storage[OscillatorParams::Pitch])) | pass())
                    >> (map::<_, _, U1, _>(|pitch| volt_hz(pitch[0])) | pass());
                let attenuated_saw = sobaka_saw() * var(&param_storage[OscillatorParams::Saw]);
                // let attenuated_sine = sine_phase(0.0) * var(&param_storage[OscillatorParams::Sine]);
                let attenuated_sine = sobaka_saw() * var(&param_storage[OscillatorParams::Sine]);
                let attenuated_square =
                    sobaka_square() * var(&param_storage[OscillatorParams::Square]);
                let attenuated_triangle =
                    sobaka_triangle() * var(&param_storage[OscillatorParams::Triangle]);

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
            inner: FundspWorklet::create(module, param_storage),
        }
    }
    fn process(&mut self, audio: &mut AudioBuffer, params: &ParamBuffer<Self::Param>) {
        self.inner.process(audio, params);
    }
}

waw::main!(Oscillator);
