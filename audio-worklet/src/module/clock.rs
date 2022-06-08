use super::{module, AudioModule32};
use crate::{
    dsp::{messaging::MessageHandler, shared::Share},
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
pub struct ClockParams {
    pub bpm: f32,
}

pub fn clock(params: ClockParams) -> impl AudioModule32 {
    let lfo_square = || {
        lfo2(|t, pitch| {
            let duty = sin_hz(bpm_hz(pitch), t);
            if duty > 0.0 {
                1.0
            } else {
                -1.0
            }
        })
    };

    let divide = [1.0, 2.0, 4.0, 8.0, 16.0];

    let clock_divider_node = branch::<U5, _, _>(|n| mul(divide[n as usize]) >> lfo_square());

    let unit = (tag(0, params.bpm) >> clock_divider_node).share();

    let handler = unit
        .clone()
        .message_handler(|unit, message: SobakaMessage| {
            match (message.addr.port, &message.args[..]) {
                // Set BPM parameter
                (Some(Port::Parameter(0)), [SobakaType::Float(bpm)]) => {
                    unit.set(0, bpm.clamp(0.0, 600.0) as f64)
                }
                _ => {}
            }
        });

    module(unit).set_tx(handler)
}
