use fundsp::prelude::*;
use waw::{
    buffer::{AudioBuffer, ParamBuffer},
    worklet::AudioModule,
};

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

    fn process(&mut self, audio: &mut AudioBuffer, params: &ParamBuffer<Self::Param>) {
        self.inner.process(audio, params);
    }
}

waw::module!(Noise);
