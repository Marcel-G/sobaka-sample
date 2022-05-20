use fundsp::hacker32::*;
use crate::interface::{message::SobakaType, address::Port};
use super::{AudioModule32, module};

pub fn parameter() -> impl AudioModule32 {
    module(
        tag(0, 440.0),
        |unit, message| {
            match (message.addr.port, &message.args[..]) {
                // Saw Attenuation Param
                (Some(Port::Parameter(0)), [SobakaType::Float(value)]) => {
                    unit.set(0, value.clamp(0.0, 1400.0) as f64)
                }
                _ => {}
            }
        }
    )
}