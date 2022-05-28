use super::{module, AudioModule32};
use crate::{dsp::{trigger::trigger}, interface::{address::Port, message::SobakaType}};
use fundsp::hacker32::*;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Default, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct EnvelopeParams {
    pub attack: f32,
    pub release: f32,
}

pub fn envelope(params: EnvelopeParams) -> impl AudioModule32 {

    let env = envelope3(|time, attack, release| {
      if time < attack {
        time.powf(2.0) / attack.powf(2.0)
      } else if time < attack + release {
        (time - (attack + release)).powf(2.0) / (release.powf(2.0))
      } else {
        0.0
      }
    });

    let params = tag(0, params.attack) | tag(1, params.release);

    // @todo forward all inputs to trigger child
    let unit = trigger(params >> env);

    module(unit, move |unit, message| {
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
    })
}
