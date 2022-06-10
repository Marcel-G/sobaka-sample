use super::ModuleContext;
use crate::{
    dsp::{messaging::MessageHandler, shared::Share},
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
pub struct DelayParams {
    pub time: f32,
}

pub fn delay(params: DelayParams, context: &mut ModuleContext) -> impl AudioUnit32 {
    let inputs = pass() | tag(0, params.time);
    let unit = (inputs >> tap(0.0, 10.0)).share();

    context.set_tx(
        unit.clone()
            .message_handler(|unit, message: SobakaMessage| {
                if let (Some(Port::Parameter(0)), [SobakaType::Float(value)]) =
                    (message.addr.port, &message.args[..])
                {
                    unit.set(0, value.clamp(0.0, 10.0) as f64)
                }
            }),
    );

    unit
}
