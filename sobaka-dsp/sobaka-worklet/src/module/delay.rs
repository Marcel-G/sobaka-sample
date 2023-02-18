use crate::{dsp::trigger::reset_trigger, fundsp_worklet::FundspWorklet};
use fundsp::prelude::*;
use waw::{
    buffer::{AudioBuffer, ParamBuffer},
    worklet::{AudioModule, Emitter},
};

#[waw::derive::derive_param]
pub enum DelayParams {
    #[param(
        automation_rate = "a-rate",
        min_value = 0.,
        max_value = 10.,
        default_value = 1.
    )]
    DelayTime,
}

pub struct Delay {
    inner: FundspWorklet,
}

impl AudioModule for Delay {
    type Param = DelayParams;

    const INPUTS: u32 = 2;

    fn create(emitter: Emitter<Self::Event>) -> Self {
        let module = {
            let inputs = pass() | tag(DelayParams::DelayTime as i64, 0.0);
            reset_trigger(inputs >> tap(0.0, 10.0))
        };

        Delay {
            inner: FundspWorklet::create(module),
        }
    }

    fn process(&mut self, audio: &mut AudioBuffer, params: &ParamBuffer<Self::Param>) {
        self.inner.process(audio, params);
    }
}

waw::main!(Delay);
