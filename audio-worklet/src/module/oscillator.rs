use super::ModuleContext;
use crate::{
    dsp::{messaging::MessageHandler, param::param32, shared::Share, volt_hz},
    interface::{
        address::Port,
        message::{SobakaMessage, SobakaType},
    },
};
use fundsp::prelude::*;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Default, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct OscillatorParams {
    pub saw: f32,
    pub sine: f32,
    pub square: f32,
    pub triangle: f32,
}

pub fn oscillator(params: OscillatorParams, context: &mut ModuleContext) -> impl AudioUnit32 {
    let input = pass() >> map(|f| volt_hz(f[0]));
    let attenuated_saw = saw() * param32(0, params.saw);
    let attenuated_sine = sine() * param32(1, params.sine);
    let attenuated_square = square() * param32(2, params.square);
    let attenuated_triangle = triangle() * param32(3, params.triangle);

    let params =
        (attenuated_saw & attenuated_sine & attenuated_square & attenuated_triangle).share();

    context.set_tx(
        params
            .clone()
            .message_handler(|unit, message: SobakaMessage| {
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
            }),
    );

    input >> oversample(params)
}
