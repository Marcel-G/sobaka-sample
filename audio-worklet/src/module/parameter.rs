use super::{module, AudioModule32};
use crate::{
    dsp::{messaging::handler, param::param32},
    interface::{address::Port, message::SobakaType},
};
use fundsp::hacker32::*;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Default, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ParameterParams {
    pub min: f32,
    pub max: f32,
    pub default: f32,
}

pub fn parameter(params: ParameterParams) -> impl AudioModule32 {
    let (sender, out) = handler(param32(0, params.default), move |unit, message| {
        match (message.addr.port, &message.args[..]) {
            // Saw Attenuation Param
            (Some(Port::Parameter(0)), [SobakaType::Float(value)]) => {
                unit.set(0, value.clamp(params.min, params.max) as f64)
            }
            _ => {}
        }
    });
    module(out).with_sender(sender)
}
