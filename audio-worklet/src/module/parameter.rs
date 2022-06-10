use super::ModuleContext;
use crate::{
    dsp::{messaging::MessageHandler, param::param32, shared::Share},
    interface::{
        address::Port,
        message::{SobakaMessage, SobakaType},
    },
};
use fundsp::prelude::*;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Default, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ParameterParams {
    pub min: f32,
    pub max: f32,
    pub default: f32,
}

pub fn parameter(params: ParameterParams, context: &mut ModuleContext) -> impl AudioUnit32 {
    let param = param32(0, params.default).share();

    context.set_tx(
        param
            .clone()
            .message_handler(|unit, message: SobakaMessage| {
                if let (Some(Port::Parameter(0)), [SobakaType::Float(bpm)]) =
                    (message.addr.port, &message.args[..])
                {
                    unit.set(0, bpm.clamp(0.0, 600.0) as f64)
                }
            }),
    );

    param
}
