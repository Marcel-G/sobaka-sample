use crate::{
    context::ModuleContext,
    dsp::{
        messaging::MessageHandler,
        scope::{scope as dsp_scope, ScopeEvent as DSPScopeEvent},
        shared::Share,
    },
    utils::observer::Observable,
};
use fundsp::prelude::*;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Default, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ScopeParams {
    pub rate: usize,
}

/// Events emitted by the scope module
#[derive(Serialize, Deserialize, TS, Clone)]
#[ts(export)]
pub enum ScopeEvent {
    RenderFrame(Vec<(f32, f32)>),
}

/// Incoming commands into the scope module
#[derive(Serialize, Deserialize, TS, Clone)]
#[ts(export)]
pub enum ScopeCommand {
    /// Sets the threshold level (-1-1)
    SetThreshold(f64),
    /// Sets the time (0-10)
    SetTime(f64),
    /// Sets trigger enabled
    SetTriggerEnabled(bool),
}

pub fn scope(
    params: &ScopeParams,
    context: &mut ModuleContext<ScopeCommand, ScopeEvent>,
) -> impl AudioUnit32 {
    let sc = dsp_scope(params.rate).share();

    context.set_tx(
        sc.clone()
            .message_handler(|unit, message: ScopeCommand| match message {
                ScopeCommand::SetThreshold(threshold) => unit.set_threshold(threshold),
                ScopeCommand::SetTime(time) => unit.set_time(time),
                ScopeCommand::SetTriggerEnabled(enabled) => unit.set_trigger_enabled(enabled),
            }),
    );

    context.set_rx(sc.clone().map(|event| match event {
        DSPScopeEvent::Update(signal) => ScopeEvent::RenderFrame(signal),
    }));

    sc
}


// @todo auto adjust scope y axis