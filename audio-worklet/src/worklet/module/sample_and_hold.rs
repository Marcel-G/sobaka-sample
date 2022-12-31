use waw::buffer::{AudioBuffer, ParamBuffer};
use waw::worklet::AudioModule;

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

    fn process(&mut self, audio: &mut AudioBuffer, params: &ParamBuffer<Self::Param>) {
        self.inner.process(audio, params);
    }
}

waw::module!(SampleAndHold);
