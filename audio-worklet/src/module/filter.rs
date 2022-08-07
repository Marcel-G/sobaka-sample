use crate::{
    context::ModuleContext,
    dsp::{messaging::MessageHandler, param::param, shared::Share, volt_hz},
};
use fundsp::prelude::*;
use serde::{Deserialize, Serialize};
use ts_rs::TS;


#[derive(Default, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct FilterParams {
    pub frequency: f32,
    pub q: f32,
}

/// Incoming commands into the filter module
#[derive(Serialize, Deserialize, TS, Clone)]
#[ts(export)]
pub enum FilterCommand {
    /// Sets the filter cutoff frequency in Hz
    SetFrequency(f64),
    /// Sets the filter Q factor
    SetQ(f64),
}

pub fn filter(
    params: &FilterParams,
    context: &mut ModuleContext<FilterCommand>,
) -> impl AudioUnit32 {
    let input = (pass()
        | ((pass() + param(0, params.frequency)) >> map(|f| volt_hz(f[0])) >> clip_to(2e1, 2e4))
        | (pass() + param(1, params.q)) >> clip_to(0.0, 10.0))
    .share();

    context.set_tx(
        input
            .clone()
            .message_handler(|unit, message: FilterCommand| match message {
                FilterCommand::SetFrequency(frequency) => unit.set(0, frequency.clamp(0.0, 10.0)),
                FilterCommand::SetQ(q) => unit.set(1, q.clamp(0.0, 10.0)),
            }),
    );

    input
        >> (lowpass::<f32, f32>()
            ^ highpass::<f32, f32>()
            ^ bandpass::<f32, f32>()
            ^ moog::<f32, f32>())
}
