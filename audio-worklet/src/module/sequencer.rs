use super::ModuleContext;
use crate::{
    dsp::{
        messaging::MessageHandler,
        shared::Share,
        stepped::{stepped, Event},
        trigger::trigger,
    },
    interface::{
        address::{Address, Port},
        message::{SobakaMessage, SobakaType},
    },
    utils::observer::Observable,
};
use fundsp::prelude::*;
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

pub fn sequencer(params: SequencerParams, context: &mut ModuleContext) -> impl AudioUnit32 {
    let steps = branch::<U8, _, _, _>(|i| tag(i, params.steps[i as usize])).share();

    context.set_tx(
        steps
            .clone()
            .message_handler(|unit, message: SobakaMessage| {
                match (message.addr.port, &message.args[..]) {
                    // Set step value
                    (Some(Port::Parameter(n)), [SobakaType::Float(value)]) if n < 8 => {
                        unit.set(n, *value as f64)
                    }
                    _ => {}
                };
            }),
    );

    let stepped = stepped::<U8, _>().share();

    context.set_rx(stepped.clone().map(|event| match event {
        Event::StepChange(step) => SobakaMessage {
            addr: Address { id: 0, port: None },
            args: vec![SobakaType::Int(step as i32)],
        },
    }));

    trigger(steps >> stepped)
}
