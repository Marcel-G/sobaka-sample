use super::{module, AudioModule32};
use crate::{
    dsp::{messaging::MessageHandler, param::param32, shared::Share},
    interface::{
        address::Port,
        message::{SobakaMessage, SobakaType},
    },
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
    let param = param32(0, params.default).share();

    let handler = param
        .clone()
        .message_handler(|unit, message: SobakaMessage| {
            match (message.addr.port, &message.args[..]) {
                // Set BPM parameter
                (Some(Port::Parameter(0)), [SobakaType::Float(bpm)]) => {
                    unit.set(0, bpm.clamp(0.0, 600.0) as f64)
                }
                _ => {}
            }
        });
    module(param).with_sender(handler)
}
