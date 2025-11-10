use crate::{dsp::volt_hz, fundsp_worklet::FundspWorklet};
use fundsp::prelude::*;
use waw::{
    buffer::{AudioBuffer, ParamBuffer},
    worklet::{AudioModule, Emitter},
};

#[waw::derive::derive_param]
pub enum FilterParams {
    #[param(
        automation_rate = "a-rate",
        min_value = 0.,
        max_value = 1.0,
        default_value = 0.1
    )]
    Q,
    #[param(
        automation_rate = "a-rate",
        min_value = 0.,
        max_value = 8.0,
        default_value = 0.1
    )]
    Frequency,
}

pub struct Filter {
    inner: FundspWorklet<FilterParams>,
}

impl AudioModule for Filter {
    type Param = FilterParams;

    const INPUTS: u32 = 1;
    const OUTPUTS: u32 = 4;

    fn create(_init: Option<Self::InitialState>, _emitter: Emitter<Self::Event>) -> Self {
        let param_storage = FundspWorklet::create_param_storage();

        let module = {
            let input = pass()
                | ((var(&param_storage[FilterParams::Frequency]))
                    >> map(|f| volt_hz(f[0]))
                    >> clip_to(2e1, 2e4))
                | (var(&param_storage[FilterParams::Q])) >> clip_to(0.0, 10.0);

            input
                >> (lowpass::<f32, f32>()
                    ^ highpass::<f32, f32>()
                    ^ bandpass::<f32, f32>()
                    ^ moog::<f32, f32>())
        };

        Filter {
            inner: FundspWorklet::create(module, param_storage),
        }
    }

    fn process(&mut self, audio: &mut AudioBuffer, params: &ParamBuffer<Self::Param>) {
        self.inner.process(audio, params);
    }
}

waw::main!(Filter);
