use super::{module, AudioModule32};
use crate::{
    dsp::param::param32,
    interface::{address::Port, message::SobakaType},
};
use fundsp::hacker32::*;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Default, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct VcaParams {
    pub value: f32,
}

pub fn vca(params: VcaParams) -> impl AudioModule32 {
    let unit = pass() * (pass() + param32(0, params.value));

    module(unit,
      move |unit, message| {
        match (message.addr.port, &message.args[..]) {
            // Manual control
            (Some(Port::Parameter(0)), [SobakaType::Float(value)]) => {
                unit.set(0, *value as f64)
            }
            _ => {}
        }
    })
}
