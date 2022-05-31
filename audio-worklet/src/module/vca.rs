use super::{module, AudioModule32};
use crate::{
    dsp::{param::param32, messaging::handler},
    interface::{address::Port, message::SobakaType},
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
    let unit = pass() * (pass() + param32(0, params.value));

    let (sender, out) = handler(unit, move |unit, message| {
        match (message.addr.port, &message.args[..]) {
            // Vca value param
            (Some(Port::Parameter(0)), [SobakaType::Float(value)]) => {
                unit.set(0, value.clamp(0.0, 1.0) as f64)
            }
            _ => {}
        }
    });

    module(out)
        .with_sender(sender)
}
