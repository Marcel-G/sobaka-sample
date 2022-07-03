use crate::{
    context::ModuleContext,
    dsp::{messaging::MessageHandler, shared::Share},
};
use fundsp::prelude::*;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Default, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct LfoParams {
    pub frequency: f32,
}

/// Incoming commands into the clock module
#[derive(Serialize, Deserialize, TS, Clone)]
#[ts(export)]
pub enum LfoCommand {
    /// Sets the frequency of the lfo in Hz
    SetFrequency(f64),
}

pub fn lfo(params: &LfoParams, context: &mut ModuleContext<LfoCommand>) -> impl AudioUnit32 {
    let wave = (tag(0, params.frequency) >> sine()).share();

    context.set_tx(
        wave.clone()
            .message_handler(|unit, command: LfoCommand| match command {
                LfoCommand::SetFrequency(bpm) => unit.set(0, bpm.clamp(0.0, 20.0)),
            }),
    );

    (wave + 1.0) * 0.5
}
