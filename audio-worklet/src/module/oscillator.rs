use super::ModuleContext;
use crate::dsp::{
    messaging::MessageHandler,
    oscillator::{sobaka_saw, sobaka_square, sobaka_triangle},
    param::param,
    shared::Share,
    volt_hz,
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

/// Incoming commands into the oscillator module
#[derive(Serialize, Deserialize, TS, Clone)]
#[ts(export)]
pub enum OscillatorCommand {
    /// Sets the level of the saw wave (0-1)
    SetSawLevel(f64),
    /// Sets the level of the sine wave (0-1)
    SetSineLevel(f64),
    /// Sets the level of the square wave (0-1)
    SetSquareLevel(f64),
    /// Sets the level of the triangle wave (0-1)
    SetTriangleLevel(f64),
}

pub fn oscillator(
    params: &OscillatorParams,
    context: &mut ModuleContext<OscillatorCommand>,
) -> impl AudioUnit32 {
    let input = pass() >> map(|f| volt_hz(f[0]));
    let attenuated_saw = sobaka_saw() * param(0, params.saw);
    let attenuated_sine = sine() * param(1, params.sine);
    let attenuated_square = sobaka_square() * param(2, params.square);
    let attenuated_triangle = sobaka_triangle() * param(3, params.triangle);

    let params =
        (attenuated_saw & attenuated_sine & attenuated_square & attenuated_triangle).share();

    context.set_tx(params.clone().message_handler(
        |unit, command: OscillatorCommand| match command {
            OscillatorCommand::SetSawLevel(level) => unit.set(0, level.clamp(0.0, 1.0)),
            OscillatorCommand::SetSineLevel(level) => unit.set(1, level.clamp(0.0, 1.0)),
            OscillatorCommand::SetSquareLevel(level) => unit.set(2, level.clamp(0.0, 1.0)),
            OscillatorCommand::SetTriangleLevel(level) => unit.set(3, level.clamp(0.0, 1.0)),
        },
    ));

    input >> oversample(params)
}
