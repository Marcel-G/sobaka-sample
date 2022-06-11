use crate::{
    context::ModuleContext,
    dsp::{messaging::MessageHandler, shared::Share},
};
use fundsp::prelude::*;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Default, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ClockParams {
    pub bpm: f32,
}

/// Incoming commands into the clock module
#[derive(Serialize, Deserialize, TS, Clone)]
#[ts(export)]
pub enum ClockCommand {
    /// Sets the BPM of the clock
    SetBPM(f64),
}

pub fn clock(params: ClockParams, context: &mut ModuleContext<ClockCommand>) -> impl AudioUnit32 {
    let lfo_square = || {
        lfo2(|t, pitch| {
            let duty = sin_hz(bpm_hz(pitch), t);
            if duty > 0.0 {
                1.0
            } else {
                -1.0
            }
        })
    };

    let divide = [1.0, 2.0, 4.0, 8.0, 16.0];

    let clock_divider_node = branch::<U5, _, _, _>(|n| mul(divide[n as usize]) >> lfo_square());

    let unit = (tag(0, params.bpm) >> clock_divider_node).share();

    context.set_tx(
        unit.clone()
            .message_handler(|unit, command: ClockCommand| match command {
                ClockCommand::SetBPM(bpm) => unit.set(0, bpm.clamp(0.0, 600.0)),
            }),
    );

    unit
}
