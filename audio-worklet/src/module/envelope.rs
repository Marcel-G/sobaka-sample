use super::ModuleContext;
use crate::{
    dsp::{messaging::MessageHandler, shared::Share, trigger::trigger},
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
pub struct EnvelopeParams {
    pub attack: f32,
    pub release: f32,
}

pub fn envelope(params: EnvelopeParams, context: &mut ModuleContext) -> impl AudioUnit32 {
    let env = envelope3(|time: f32, attack, release| {
        if time < attack {
            time.powf(2.0) / attack.powf(2.0)
        } else if time < attack + release {
            (time - (attack + release)).powf(2.0) / (release.powf(2.0))
        } else {
            0.0
        }
    });

    let params = (tag(0, params.attack) | tag(1, params.release)).share();

    context.set_tx(
        params
            .clone()
            .message_handler(|unit, message: SobakaMessage| {
                match (message.addr.port, &message.args[..]) {
                    // Envelope attack param
                    (Some(Port::Parameter(0)), [SobakaType::Float(value)]) => {
                        unit.set(0, *value as f64)
                    }
                    // Envelope release param
                    (Some(Port::Parameter(1)), [SobakaType::Float(value)]) => {
                        unit.set(1, *value as f64)
                    }
                    _ => {}
                }
            }),
    );

    trigger(params >> env)
}
