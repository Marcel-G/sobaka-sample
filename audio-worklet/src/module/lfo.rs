use crate::{
    context::ModuleContext,
    dsp::{messaging::MessageHandler, shared::Share, trigger::reset_trigger},
};
use fundsp::prelude::*;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Default, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct LfoParams {
    pub bpm: f32,
}

/// Incoming commands into the clock module
#[derive(Serialize, Deserialize, TS, Clone)]
#[ts(export)]
pub enum LfoCommand {
    /// Sets the rate of the lfo in bpm
    SetBPM(f64),
}

pub fn lfo(params: &LfoParams, context: &mut ModuleContext<LfoCommand>) -> impl AudioUnit32 {
    let wave = (pass() | (pass() + tag(0, params.bpm)))
        >> (pass() | map::<_, _, U1, _>(|f| bpm_hz(f[0])))
        >> reset_trigger(sine_phase(0.0));

    let out = wave.share();

    context.set_tx(
        out.clone()
            .message_handler(|unit, command: LfoCommand| match command {
                LfoCommand::SetBPM(bpm) => unit.set(0, bpm.clamp(0.0, 600.0)),
            }),
    );

    (out + 1.0) * 0.5
}
