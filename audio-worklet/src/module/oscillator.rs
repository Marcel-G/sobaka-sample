use super::ModuleContext;
use crate::dsp::{
    join::dsp_join,
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
    pub pitch: f32,
    pub saw: f32,
    pub sine: f32,
    pub square: f32,
    pub triangle: f32,
}

/// Incoming commands into the oscillator module
#[derive(Serialize, Deserialize, TS, Clone)]
#[ts(export)]
pub enum OscillatorCommand {
    /// Sets the pitch of the oscillator
    SetPitch(f32),
    /// Sets the level of the saw wave (0-1)
    SetSawLevel(f32),
    /// Sets the level of the sine wave (0-1)
    SetSineLevel(f32),
    /// Sets the level of the square wave (0-1)
    SetSquareLevel(f32),
    /// Sets the level of the triangle wave (0-1)
    SetTriangleLevel(f32),
}

pub fn oscillator(
    params: &OscillatorParams,
    context: &mut ModuleContext<OscillatorCommand>,
) -> impl AudioUnit32 {
    let multi_osc = stack::<U4, _, _, _>(|_n| {
        let input = (pass() + tag(4, 0.0)) >> map(|f| volt_hz(f[0]));
        let attenuated_saw = sobaka_saw() * param(0, params.saw);
        let attenuated_sine = sine() * param(1, params.sine);
        let attenuated_square = sobaka_square() * param(2, params.square);
        let attenuated_triangle = sobaka_triangle() * param(3, params.triangle);

        input
            >> oversample(
                attenuated_saw & attenuated_sine & attenuated_square & attenuated_triangle,
            )
    }) >> dsp_join::<U4, _>()
        >> shape(Shape::Tanh(0.8));

    let out = multi_osc.share();

    context.set_tx(
        out.clone()
            .message_handler(|unit, command: OscillatorCommand| match command {
                OscillatorCommand::SetPitch(pitch) => unit.set(4, pitch.into()),
                OscillatorCommand::SetSawLevel(level) => unit.set(0, level.clamp(0.0, 1.0).into()),
                OscillatorCommand::SetSineLevel(level) => unit.set(1, level.clamp(0.0, 1.0).into()),
                OscillatorCommand::SetSquareLevel(level) => {
                    unit.set(2, level.clamp(0.0, 1.0).into())
                }
                OscillatorCommand::SetTriangleLevel(level) => {
                    unit.set(3, level.clamp(0.0, 1.0).into())
                }
            }),
    );

    out
}
