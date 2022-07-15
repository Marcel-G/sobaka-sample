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
pub struct StepSequencerParams {
    pub steps: [[bool; 8]; 4],
}

/// Events emitted by the sequencer module
#[derive(Serialize, Deserialize, TS, Clone)]
#[ts(export)]
pub enum StepSequencerEvent {
    /// StepChange is emitted whenever the step is changed
    StepChange(usize),
}

/// Incoming commands into the sequencer module
#[derive(Serialize, Deserialize, TS, Clone)]
#[ts(export)]
pub enum StepSequencerCommand {
    /// Update the value of a given step
    UpdateStep((usize, usize), bool),
}

pub fn step_sequencer(
    params: &StepSequencerParams,
    context: &mut ModuleContext<StepSequencerCommand, StepSequencerEvent>,
) -> impl AudioUnit32 {
    let steps = branch::<U4, _, _, _>(|x| {
        branch::<U8, _, _, _>(|y| {
            tag(
                y,
                if params.steps[x as usize][y as usize] {
                    1.0
                } else {
                    0.0
                },
            )
        })
    })
    .share();

    context.set_tx(
        steps
            .clone()
            .message_handler(|unit, command: StepSequencerCommand| match command {
                StepSequencerCommand::UpdateStep((x, y), value) => unit
                    .node_mut(x)
                    .set(y as i64, if value { 1.0 } else { 0.0 }),
            }),
    );

    let stepped = stepped::<U8, U4, _>(true).share();

    context.set_rx(stepped.clone().map(|event| match event {
        SteppedEvent::StepChange(step) => StepSequencerEvent::StepChange(step),
    }));

    (
        pass() | // Gate input
        pass() | // Reset input
        steps
    ) >> stepped
}
