use fundsp::hacker32::*;
use crate::interface::{message::SobakaType, address::Port};
use super::{AudioModule32, module};

pub fn oscillator() -> impl AudioModule32 {
    let attenuated_saw = saw() * tag(0, 0.25);
    let attenuated_sine = sine() * tag(1, 0.25);
    let attenuated_square = square() * tag(2, 0.25);
    let attenuated_triangle = triangle() * tag(3, 0.25);

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