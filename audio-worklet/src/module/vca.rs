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
pub struct VcaParams {
    pub value: f32,
}

pub fn vca(params: VcaParams) -> impl AudioModule32 {
    let unit = (pass() * (pass() + param32(0, params.value))).share();

    let handler = unit
        .clone()
        .message_handler(|unit, message: SobakaMessage| {
            if let (Some(Port::Parameter(0)), [SobakaType::Float(value)]) =
                (message.addr.port, &message.args[..])
            {
                unit.set(0, value.clamp(0.0, 1.0) as f64)
            }
        });

    module(unit).set_tx(handler)
}
