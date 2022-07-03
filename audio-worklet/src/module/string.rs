use super::ModuleContext;
use crate::dsp::{messaging::MessageHandler, pluck::dsp_pluck, shared::Share, volt_hz};
use fundsp::prelude::*;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Default, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct StringParams {
    pub gain_per_second: f32,
    pub damping: f32,
}

/// Incoming commands into the string module
#[derive(Serialize, Deserialize, TS, Clone)]
#[ts(export)]
pub enum StringCommand {
    /// Sets the threshold level (-1-1)
    SetGainPerSecond(f32),
    /// Sets the time (0-10)
    SetDamping(f32),
}

pub fn string(
    params: &StringParams,
    context: &mut ModuleContext<StringCommand>,
) -> impl AudioUnit32 {
    let oscillator = dsp_pluck(params.gain_per_second, params.damping).share();

    context.set_tx(oscillator.clone().message_handler(
        |unit, message: StringCommand| match message {
            StringCommand::SetGainPerSecond(val) => unit.set_gain(val),
            StringCommand::SetDamping(val) => unit.set_damping(val),
        },
    ));

    (pass() | (pass() >> map(|f| volt_hz(f[0])))) >> oscillator
}
