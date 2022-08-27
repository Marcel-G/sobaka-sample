use crate::{
    context::ModuleContext,
    dsp::{messaging::MessageHandler, midi::midi_poly, shared::Share},
};
use fundsp::prelude::*;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Incoming commands into the midi module
#[derive(Serialize, Deserialize, TS, Clone)]
#[ts(export)]
pub enum MidiCommand {
    /// Command when note starts (0-127)
    NoteOn(u8),
    /// Command when note ends (0-127)
    NoteOff(u8),
}

pub fn midi(_params: (), context: &mut ModuleContext<MidiCommand>) -> impl AudioUnit32 {
    let notes = midi_poly::<U1, _>().share();

    context.set_tx(
        notes
            .clone()
            .message_handler(|unit, command: MidiCommand| match command {
                MidiCommand::NoteOn(n) => {
                    unit.note_on(n)
                    // on note will cycle to the next branch and set the note / gate
                }
                MidiCommand::NoteOff(n) => {
                    unit.note_off(n)
                    // note off will set the gate for the note to 0
                }
            }),
    );

    // outputs 1-N gate channels
    // outputs N-8 pitch channels
    notes
}
