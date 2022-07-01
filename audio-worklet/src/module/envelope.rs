use crate::{
    context::ModuleContext,
    dsp::{messaging::MessageHandler, shared::Share, trigger::trigger},
};
use fundsp::prelude::*;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Default, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct EnvelopeParams {
    pub attack: f32,
    pub release: f32,
}

/// Incoming commands into the envelope module
#[derive(Serialize, Deserialize, TS, Clone)]
#[ts(export)]
pub enum EnvelopeCommand {
    /// Sets the attack time in seconds
    SetAttack(f64),
    /// Sets the release time in seconds
    SetRelease(f64),
}

pub fn envelope(
    params: &EnvelopeParams,
    context: &mut ModuleContext<EnvelopeCommand>,
) -> impl AudioUnit32 {
    let env = envelope3(|time: f32, attack, release| {
        if time < attack {
            time.powf(2.0) / attack.powf(2.0)
        } else if time < attack + release {
            (time - (attack + release)).powf(2.0) / (release.powf(2.0))
        } else {
            0.0
        }
    });

    let params = (tag(0, params.attack) | tag(1, params.release)).share();

    context.set_tx(params.clone().message_handler(
        |unit, command: EnvelopeCommand| match command {
            EnvelopeCommand::SetAttack(attack) => unit.set(0, attack.clamp(0.0, 10.0)),
            EnvelopeCommand::SetRelease(release) => unit.set(1, release.clamp(0.0, 10.0)),
        },
    ));

    trigger(params >> env)
}
