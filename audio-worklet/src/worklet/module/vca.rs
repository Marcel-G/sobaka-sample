use super::ModuleContext;
use crate::dsp::{messaging::MessageHandler, param::param32, shared::Share};
use fundsp::prelude::*;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Default, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct VcaParams {
    pub value: f32,
}

/// Incoming commands into the reverb module
#[derive(Serialize, Deserialize, TS, Clone)]
#[ts(export)]
pub enum VcaCommand {
    /// Sets the level of the VCA
    SetLevel(f64),
}

pub fn vca(params: &VcaParams, context: &mut ModuleContext<VcaCommand>) -> impl AudioUnit32 {
    let unit = (pass() * (pass() + param32(0, params.value))).share();

    context.set_tx(
        unit.clone()
            .message_handler(|unit, message: VcaCommand| match message {
                VcaCommand::SetLevel(value) => unit.set(0, value.clamp(0.0, 1.0)),
            }),
    );

    unit
}
