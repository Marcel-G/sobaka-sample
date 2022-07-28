use crate::{
    context::ModuleContext,
    dsp::{
        envelope::dsp_envelope, messaging::MessageHandler, shared::Share, trigger::SchmittTrigger,
    },
    utils::atomic_float::AtomicFloat,
};
use fundsp::prelude::*;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Default, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct EnvelopeParams {
    pub attack: f32,
    pub decay: f32,
    pub sustain: f32,
    pub release: f32,
}

/// Incoming commands into the envelope module
#[derive(Serialize, Deserialize, TS, Clone)]
#[ts(export)]
pub enum EnvelopeCommand {
    /// Sets the attack time in seconds
    SetAttack(f64),

    /// Sets the decay time in seconds
    SetDecay(f64),

    /// Sets sustain level (0-1)
    SetSustain(f64),

    /// Sets the release time in seconds
    SetRelease(f64),
}

// g_{2}\left(x,l,u\right)=f_{2}\left(\frac{x-l}{u-l}\right)\left(u-l\right)+l
fn g2(x: f32, l: f32, u: f32) -> f32 {
    f2((x - l) / (u - l)) * (u - l) + l
}

// f_{1}\left(x\right)=x^{\frac{1}{3}}
fn f1(x: f32) -> f32 {
    x.powf(1.0 / 3.0)
}

// f_{2}\left(x\right)=x^{3}
fn f2(x: f32) -> f32 {
    x.powf(3.0)
}

pub fn envelope(
    params: &EnvelopeParams,
    context: &mut ModuleContext<EnvelopeCommand>,
) -> impl AudioUnit32 {
    let on_offset = AtomicFloat::new(0.0);
    let off_offset = AtomicFloat::new(0.0);
    let trigger = SchmittTrigger::new();

    let env = dsp_envelope(move |time: f32, inputs: Frame<f32, U5>| {
        let gate = inputs[0];
        let attack = inputs[1];
        let decay = inputs[2];
        let sustain = inputs[3].clamp(0.0 + f32::EPSILON, 1.0 - f32::EPSILON);
        let release = inputs[4];

        if let Some(is_open) = trigger.tick(gate, 0.0, 0.001) {
            if is_open {
                on_offset.set(time as f64);
            } else {
                off_offset.set(time as f64);
            }
        }

        let position = time - on_offset.get() as f32;
        if trigger.is_open() {
            // https://www.desmos.com/calculator/nduy9l2pez
            if position < attack {
                f1(1.0 / attack * position)
            } else if position < decay + attack {
                g2(
                    ((sustain - 1.0) / decay) * (position - attack) + 1.0,
                    sustain,
                    1.0,
                )
            } else {
                sustain
            }
        } else {
            let sustain_time = off_offset.get() as f32 - on_offset.get() as f32;
            if position < sustain_time + release {
                g2(
                    (-sustain / release) * (position - sustain_time) + sustain,
                    0.0,
                    sustain,
                )
            } else {
                0.0
            }
        }
    });

    let params = (pass() | // Gate input
        tag(0, params.attack) |
        tag(1, params.decay) |
        tag(2, params.sustain) |
        tag(3, params.release))
    .share();

    context.set_tx(params.clone().message_handler(
        |unit, command: EnvelopeCommand| match command {
            EnvelopeCommand::SetAttack(attack) => unit.set(0, attack.clamp(0.0, 10.0)),
            EnvelopeCommand::SetDecay(decay) => unit.set(1, decay.clamp(0.0, 10.0)),
            EnvelopeCommand::SetSustain(sustain) => unit.set(2, sustain.clamp(0.0, 1.0)),
            EnvelopeCommand::SetRelease(release) => unit.set(3, release.clamp(0.0, 10.0)),
        },
    ));

    params >> env >> declick::<f32, f32>()
}
