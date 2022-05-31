use super::{module, AudioModule32};
use crate::{interface::{address::Port, message::SobakaType}, dsp::messaging::handler};
use fundsp::hacker32::*;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Default, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct DelayParams {
    pub time: f32,
}

pub fn delay(params: DelayParams) -> impl AudioModule32 {
    let inputs = pass() | tag(0, params.time);
    let unit = inputs >> tap(0.0, 10.0);

    let (sender, out) = handler(unit, move |unit, message| {
        match (message.addr.port, &message.args[..]) {
            // Delay time param
            (Some(Port::Parameter(0)), [SobakaType::Float(value)]) => {
                unit.set(0, value.clamp(0.0, 10.0) as f64)
            }
            _ => {}
        }
    });

    module(out)
        .with_sender(sender)
}
