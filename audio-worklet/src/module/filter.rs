use super::{module, AudioModule32};
use crate::{interface::{address::Port, message::SobakaType}, dsp::param::{param}};
use fundsp::hacker32::*;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Default, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct FilterParams {
    pub frequency: f32,
    pub q: f32
}

pub fn filter(params: FilterParams) -> impl AudioModule32 {
    let input = pass() | param(0, params.frequency) | param(1, params.q);

    let filter = input >> (lowpass() ^ highpass() ^ bandpass() ^ moog());
  
    module(filter, move |unit, message| {
        match (message.addr.port, &message.args[..]) {
            // Filter frequency param
            (Some(Port::Parameter(0)), [SobakaType::Float(value)]) => {
                unit.set(0, *value as f64)
            }
            // Filter frequency param
            (Some(Port::Parameter(1)), [SobakaType::Float(value)]) => {
                unit.set(1, *value as f64)
            }
            _ => {}
        }
    })
}
