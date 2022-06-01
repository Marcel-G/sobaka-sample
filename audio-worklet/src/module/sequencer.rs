use std::convert::TryInto;

use super::{module, AudioModule32};
use crate::{
    dsp::{messaging::{handler, emitter}, stepped::stepped, trigger::trigger},
    interface::{address::{Port, self, Address}, message::{SobakaType, SobakaMessage}},
};
use fundsp::hacker32::*;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Default, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct SequencerParams {
    pub steps: [f32; 8],
}

pub fn sequencer(params: SequencerParams) -> impl AudioModule32 {
    // @todo
    //  - refactor trigger to use `>>`
    //  - same for stepped
    let unit = trigger(stepped([
        tag(0, params.steps[0]),
        tag(1, params.steps[1]),
        tag(2, params.steps[2]),
        tag(3, params.steps[3]),
        tag(4, params.steps[4]),
        tag(5, params.steps[5]),
        tag(6, params.steps[6]),
        tag(7, params.steps[7]),
    ]));

    let mut toggle = false;

    let (receiver, oo) = emitter(|val| {
        if val > &0.0 && !toggle {
            toggle = true;
            Some(SobakaMessage {
                addr: Address {
                    port: Some(Port::Output(0)),
                    id: 0,
                },
                args: vec![],
            })
        } else {
            toggle = false;
            None
        }
    });

    let (sender, out) = handler(unit, move |unit, message| {
        match (message.addr.port, &message.args[..]) {
            // Set step value
            (Some(Port::Parameter(n)), [SobakaType::Float(value)]) if n < 8 => {
                unit.set(n, *value as f64)
            }
            _ => {}
        }
    });

    module(out).with_sender(sender)
}
