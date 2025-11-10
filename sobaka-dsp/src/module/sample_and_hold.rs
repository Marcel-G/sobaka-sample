use waw::buffer::{AudioBuffer, ParamBuffer};
use waw::worklet::{AudioModule, Emitter};

use crate::dsp::hold::hold;

use crate::fundsp_worklet::FundspWorklet;
pub struct SampleAndHold {
    inner: FundspWorklet,
}

impl AudioModule for SampleAndHold {
    const INPUTS: u32 = 2;

    fn create(_init: Option<Self::InitialState>, _emitter: Emitter<Self::Event>) -> Self {
        let module = hold();

        SampleAndHold {
            inner: FundspWorklet::create(module, Default::default()),
        }
    }

    fn process(&mut self, audio: &mut AudioBuffer, params: &ParamBuffer<Self::Param>) {
        self.inner.process(audio, params);
    }
}

waw::main!(SampleAndHold);
