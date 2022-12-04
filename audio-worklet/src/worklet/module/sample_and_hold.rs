use wasm_worklet::types::{AudioModule, ParamMap};
use crate::dsp::hold::hold;

use crate::fundsp_worklet::FundspWorklet;
pub struct SampleAndHold {
    inner: FundspWorklet,
}

impl AudioModule for SampleAndHold {
    const INPUTS: u32 = 2;

    fn create() -> Self {
        let module = hold();

        SampleAndHold {
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

wasm_worklet::module!(SampleAndHold);
