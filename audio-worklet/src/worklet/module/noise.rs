use fundsp::prelude::*;
use wasm_worklet::types::{AudioModule, ParamMap};

use crate::fundsp_worklet::FundspWorklet;
pub struct Noise {
    inner: FundspWorklet,
}

impl AudioModule for Noise {
    const INPUTS: u32 = 0;

    fn create() -> Self {
        let module = white();

        Noise {
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

wasm_worklet::module!(Noise);
