use fundsp::hacker32::*;
use ts_rs::TS;
use serde::{Serialize, Deserialize};
use crate::{interface::{message::SobakaType, address::Port}, dsp::param::{param32}};
use super::{AudioModule32, module};

#[derive(Default, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ParameterParams {
    pub min: f32,
    pub max: f32,
    pub default: f32 
}

pub fn parameter(params: ParameterParams) -> impl AudioModule32 {
    module(
        param32(0, params.default),
        move |unit, message| {
            match (message.addr.port, &message.args[..]) {
                // Saw Attenuation Param
                (Some(Port::Parameter(0)), [SobakaType::Float(value)]) => {
                    unit.set(0, value.clamp(params.min, params.max) as f64)
                }
                _ => {}
            }
        }
    )
}