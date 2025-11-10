use fundsp::prelude::*;
use waw::{
    buffer::{AudioBuffer, ParamBuffer},
    worklet::{AudioModule, Emitter},
};

use crate::fundsp_worklet::FundspWorklet;
pub struct Noise {
    inner: FundspWorklet,
}

impl AudioModule for Noise {
    const INPUTS: u32 = 0;

    fn create(_init: Option<Self::InitialState>, _emitter: Emitter<Self::Event>) -> Self {
        let module = white();

        Noise {
            inner: FundspWorklet::create(module, Default::default()),
        }
    }

    fn process(&mut self, audio: &mut AudioBuffer, params: &ParamBuffer<Self::Param>) {
        self.inner.process(audio, params);
    }
}

waw::main!(Noise);
