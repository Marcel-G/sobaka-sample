use super::ModuleContext;
use crate::{
    dsp::{
        messaging::MessageHandler,
        shared::Share,
        stepped::{stepped, SteppedEvent},
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

/// Events emitted by the sequencer module
#[derive(Serialize, Deserialize, TS, Clone)]
#[ts(export)]
pub enum SequencerEvent {
    /// StepChange is emitted whenever the step is changed
    StepChange(usize),
}

/// Incoming commands into the sequencer module
#[derive(Serialize, Deserialize, TS, Clone)]
#[ts(export)]
pub enum SequencerCommand {
    /// Update the value of a given step
    UpdateStep(usize, f64),
}

pub fn sequencer(
    params: &SequencerParams,
    context: &mut ModuleContext<SequencerCommand, SequencerEvent>,
) -> impl AudioUnit32 {
    let steps = branch::<U8, _, _, _>(|i| tag(i, params.steps[i as usize])).share();

    context.set_tx(steps.clone().message_handler(
        |unit, command: SequencerCommand| match command {
            SequencerCommand::UpdateStep(i, value) => unit.set(i as i64, value),
        },
    ));

    let stepped = stepped::<U8, U1, _>(false).share();

    context.set_rx(stepped.clone().map(|event| match event {
        SteppedEvent::StepChange(step) => SequencerEvent::StepChange(step),
    }));

    (pass() | steps) >> stepped
}
