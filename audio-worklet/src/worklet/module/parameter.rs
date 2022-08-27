use super::ModuleContext;
use crate::dsp::{messaging::MessageHandler, param::param32, shared::Share};
use fundsp::prelude::*;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Default, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ParameterParams {
    pub min: f32,
    pub max: f32,
    pub default: f32,
}

/// Incoming commands into the parameter module
#[derive(Serialize, Deserialize, TS, Clone)]
#[ts(export)]
pub enum ParameterCommand {
    /// Sets the value of the parameter
    SetParameter(f64),
}

pub fn parameter(
    params: &ParameterParams,
    context: &mut ModuleContext<ParameterCommand>,
) -> impl AudioUnit32 {
    let min = params.min;
    let max = params.max;

    let param = param32(0, params.default).share();

    context.set_tx(
        param
            .clone()
            .message_handler(move |unit, command: ParameterCommand| match command {
                ParameterCommand::SetParameter(value) => {
                    unit.set(0, value.clamp(min as f64, max as f64))
                }
            }),
    );

    param
}
