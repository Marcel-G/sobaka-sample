use super::{module, AudioModule32};
use crate::{
    interface::{address::Port, message::SobakaType}, dsp::{stepped::stepped, param::param, trigger::trigger},
};
use fundsp::hacker32::*;
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use web_sys::console;

#[derive(Default, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct SequencerParams {
    pub steps: [f32; 8],
}

pub fn sequencer(params: SequencerParams) -> impl AudioModule32 {

    // @todo
    //  - refactor trigger to use `>>`
    //  - same for stepped
    let unit = trigger(stepped([
      param(0, params.steps[0]),
      param(1, params.steps[1]),
      param(2, params.steps[2]),
      param(3, params.steps[3]),
      param(4, params.steps[4]),
      param(5, params.steps[5]),
      param(6, params.steps[6]),
      param(7, params.steps[7]),
    ]));

    module(
      unit,
      move |unit, message| {
        match (message.addr.port, &message.args[..]) {
            // Set step value
            (Some(Port::Parameter(n)), [SobakaType::Float(value)]) if n < 8 => {
                unit.set(n, *value as f64)
            }
            _ => {}
        }
    })
}
