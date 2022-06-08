use super::{module, AudioModule32};
use crate::{
    dsp::{param::param, shared::Share, volt_hz, messaging::MessageHandler},
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
pub struct FilterParams {
    pub frequency: f32,
    pub q: f32,
}

pub fn filter(params: FilterParams) -> impl AudioModule32 {
    let input =
        (pass() | (param(0, params.frequency) >> map(|f| volt_hz(f[0]))) | param(1, params.q))
            .share();

    let handler = input.clone().message_handler(|unit, message: SobakaMessage| {
        match (message.addr.port, &message.args[..]) {
            // Frequency param
            (Some(Port::Parameter(0)), [SobakaType::Float(value)]) => unit.set(0, *value as f64),
            // Q param
            (Some(Port::Parameter(1)), [SobakaType::Float(value)]) => unit.set(1, *value as f64),
            _ => {}
        }
    });

    let filter = input >> (lowpass() ^ highpass() ^ bandpass() ^ moog());

    module(filter).with_sender(handler)
}
