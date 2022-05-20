use fundsp::hacker32::*;
use serde::{Serialize, Deserialize};
use crate::interface::{message::SobakaType, address::Port};
use super::{AudioModule32, module};
use ts_rs::TS;

#[derive(Default, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct OscillatorParams {
    pub saw: f32,
    pub sine: f32,
    pub square: f32,
    pub triangle: f32
}

pub fn oscillator(params: OscillatorParams) -> impl AudioModule32 {
    let attenuated_saw = saw() * tag(0, params.saw);
    let attenuated_sine = sine() * tag(1, params.sine);
    let attenuated_square = square() * tag(2, params.square);
    let attenuated_triangle = triangle() * tag(3, params.triangle);

    let unit = oversample(
        attenuated_saw &
        attenuated_sine &
        attenuated_square &
        attenuated_triangle
    );

    module(
        unit,
        |unit, message| {
            match (message.addr.port, &message.args[..]) {
                // Saw Attenuation Param
                (Some(Port::Parameter(0)), [SobakaType::Float(value)]) => {
                    unit.set(0, value.clamp(0.0, 1.0) as f64)
                }

                // Sine Attenuation Param
                (Some(Port::Parameter(1)), [SobakaType::Float(value)]) => {
                    unit.set(1, value.clamp(0.0, 1.0) as f64)
                }

                // Square Attenuation Param
                (Some(Port::Parameter(2)), [SobakaType::Float(value)]) => {
                    unit.set(2, value.clamp(0.0, 1.0) as f64)
                }

                // Triangle Attenuation Param
                (Some(Port::Parameter(3)), [SobakaType::Float(value)]) => {
                    unit.set(3, value.clamp(0.0, 1.0) as f64)
                }
                _ => {}
            }
        }
    )
}