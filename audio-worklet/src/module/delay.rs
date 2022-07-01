use crate::{
    context::ModuleContext,
    dsp::{messaging::MessageHandler, shared::Share},
};
use fundsp::prelude::*;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Default, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct DelayParams {
    pub time: f32,
}

/// Incoming commands into the delay module
#[derive(Serialize, Deserialize, TS, Clone)]
#[ts(export)]
pub enum DelayCommand {
    /// Sets the delay time in seconds
    SetDelay(f64),
}

pub fn delay(params: &DelayParams, context: &mut ModuleContext<DelayCommand>) -> impl AudioUnit32 {
    let inputs = pass() | tag(0, params.time);
    let unit = (inputs >> tap(0.0, 10.0)).share();

    context.set_tx(
        unit.clone()
            .message_handler(|unit, command: DelayCommand| match command {
                DelayCommand::SetDelay(time) => unit.set(0, time.clamp(0.0, 10.0)),
            }),
    );

    unit
}
