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
pub struct VcaParams {
    pub value: f32,
}

pub fn vca(params: VcaParams, context: &mut ModuleContext) -> impl AudioUnit32 {
    let unit = (pass() * (pass() + param32(0, params.value))).share();

    context.set_tx(
        unit.clone()
            .message_handler(|unit, message: SobakaMessage| {
                if let (Some(Port::Parameter(0)), [SobakaType::Float(value)]) =
                    (message.addr.port, &message.args[..])
                {
                    unit.set(0, value.clamp(0.0, 1.0) as f64)
                }
            }),
    );

    unit
}
