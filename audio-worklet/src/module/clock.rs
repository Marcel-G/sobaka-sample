use super::{module, AudioModule32};
use crate::{
    interface::{address::Port, message::SobakaType},
};
use fundsp::hacker32::*;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Default, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ClockParams {
    pub bpm: f32,
}

pub fn clock(params: ClockParams) -> impl AudioModule32 {
    let lfo_square = || {
        lfo2(|t, pitch| {
            let duty = sin_hz(bpm_hz(pitch), t);
            if duty > 0.0 { 1.0 } else { -1.0 }
        })
    };

    let clock_divider_node = branch::<U4, _, _>(|n| {
        mul(n as f32 + 1.0) >> lfo_square()
    });

    module(
      tag(0, params.bpm) >> clock_divider_node,
      move |unit, message| {
        match (message.addr.port, &message.args[..]) {
            // Set BPM parameter
            (Some(Port::Parameter(0)), [SobakaType::Float(bpm)]) => {
                unit.set(0, bpm.clamp(0.0, 600.0) as f64)
            }
            _ => {}
        }
    })
}
