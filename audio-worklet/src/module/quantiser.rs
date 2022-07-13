use crate::{
    context::ModuleContext,
    dsp::{
        messaging::MessageHandler,
        quantiser::{self, dsp_quantiser},
        shared::Share,
    },
};
use fundsp::prelude::*;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Default, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct QuantiserParams {
    pub notes: [bool; 12],
}

/// Incoming commands into the quantiser module.
#[derive(Serialize, Deserialize, TS, Clone)]
#[ts(export)]
pub enum QuantiserCommand {
    /// Updates the notes to quantise to
    UpdateNotes([bool; 12]),
}

pub fn quantiser(
    params: &QuantiserParams,
    context: &mut ModuleContext<QuantiserCommand>,
) -> impl AudioUnit32 {
    let module = stack::<U4, _, _, _>(|_n| dsp_quantiser(params.notes)).share();

    context.set_tx(module.clone().message_handler(
        |unit, command: QuantiserCommand| match command {
            QuantiserCommand::UpdateNotes(notes) => (0..4).for_each(|i| {
                unit.node_mut(i).update_notes(notes);
            }),
        },
    ));

    module
}
