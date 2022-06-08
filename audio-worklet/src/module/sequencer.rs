use super::{module, AudioModule32};
use crate::{
    dsp::{
        stepped::{stepped, Event},
        trigger::trigger, messaging::{MessageHandler}, shared::Share,
    },
    interface::{
        address::{Address, Port},
        message::{SobakaMessage, SobakaType},
    },
    utils::observer::{Observable},
};
use fundsp::hacker32::*;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Default, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct SequencerParams {
    pub steps: [f32; 8],
}

#[derive(Serialize, Deserialize, TS)]
#[ts(export)]
pub enum SequencerEvents {
    // Sequencer module emits StepChange whenever the step is changed
    StepChange(usize),
    // Sequencer module handles incoming UpdateStep messages
    // by setting the value of the given step.
    UpdateStep(usize, f32),
}

pub fn sequencer(params: SequencerParams) -> impl AudioModule32 {
    let steps = branch::<U8, _, _>(|i| tag(i, params.steps[i as usize])).share();

    let handler = steps.clone().message_handler(|unit, message: SobakaMessage| {
        match (message.addr.port, &message.args[..]) {
            // Set step value
            (Some(Port::Parameter(n)), [SobakaType::Float(value)]) if n < 8 => {
                unit.set(n, *value as f64)
            }
            _ => {}
        };

    });

    let stepped = stepped::<U8, _>().share();

    let reciever = stepped.clone().map(|event| {
        match event {
            Event::StepChange(step) => SobakaMessage {
                addr: Address { id: 0, port: None },
                args: vec![SobakaType::Int(step as i32)],
            },
        }
    });

    let unit = trigger(steps >> stepped);

    module(unit).with_sender(handler).with_receiver(reciever)
}
