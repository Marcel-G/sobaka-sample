use super::ModuleContext;
use crate::{
    dsp::{messaging::MessageHandler, param::param, shared::Share, volt_hz},
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
pub struct FilterParams {
    pub frequency: f32,
    pub q: f32,
}

pub fn filter(params: FilterParams, context: &mut ModuleContext) -> impl AudioUnit32 {
    let input =
        (pass() | (param(0, params.frequency) >> map(|f| volt_hz(f[0]))) | param(1, params.q))
            .share();

    context.set_tx(
        input
            .clone()
            .message_handler(|unit, message: SobakaMessage| {
                match (message.addr.port, &message.args[..]) {
                    // Frequency param
                    (Some(Port::Parameter(0)), [SobakaType::Float(value)]) => {
                        unit.set(0, *value as f64)
                    }
                    // Q param
                    (Some(Port::Parameter(1)), [SobakaType::Float(value)]) => {
                        unit.set(1, *value as f64)
                    }
                    _ => {}
                }
            }),
    );

    input
        >> (lowpass::<f32, f32>()
            ^ highpass::<f32, f32>()
            ^ bandpass::<f32, f32>()
            ^ moog::<f32, f32>())
}
