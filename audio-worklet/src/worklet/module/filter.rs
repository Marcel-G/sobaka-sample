use crate::{
    dsp::{param::param, volt_hz},
    fundsp_worklet::FundspWorklet,
};
use fundsp::prelude::*;
use wasm_worklet::types::{AudioModule, ParamMap};

wasm_worklet::derive_param! {
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
}

pub struct Filter {
    inner: FundspWorklet,
}

impl AudioModule for Filter {
    type Param = FilterParams;

    const INPUTS: u32 = 1;
    const OUTPUTS: u32 = 4;

    fn create() -> Self {
        let module = {
            let input = pass()
                | ((param(FilterParams::Frequency as i64, 0.0))
                    >> map(|f| volt_hz(f[0]))
                    >> clip_to(2e1, 2e4))
                | (param(FilterParams::Q as i64, 0.0)) >> clip_to(0.0, 10.0);

            input
                >> (lowpass::<f32, f32>()
                    ^ highpass::<f32, f32>()
                    ^ bandpass::<f32, f32>()
                    ^ moog::<f32, f32>())
        };

        Filter {
            inner: FundspWorklet::create(module),
        }
    }

    fn process(
        &mut self,
        inputs: &[&[[f32; 128]]],
        outputs: &mut [&mut [[f32; 128]]],
        params: &ParamMap<Self::Param>,
    ) {
        self.inner.process(inputs, outputs, params);
    }
}

wasm_worklet::module!(Filter);
