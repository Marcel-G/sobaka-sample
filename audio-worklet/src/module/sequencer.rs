use super::{module, AudioModule32};
use crate::{
    interface::{address::Port, message::SobakaType}, dsp::{stepped::stepped, trigger::trigger},
};
use fundsp::hacker32::*;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

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
      tag(0, params.steps[0]),
      tag(1, params.steps[1]),
      tag(2, params.steps[2]),
      tag(3, params.steps[3]),
      tag(4, params.steps[4]),
      tag(5, params.steps[5]),
      tag(6, params.steps[6]),
      tag(7, params.steps[7]),
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
