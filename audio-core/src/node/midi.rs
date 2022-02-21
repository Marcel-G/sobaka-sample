use dasp::graph::{Buffer, Input, Node};
use serde::{Deserialize, Serialize};
use ts_rs::TS;

use crate::graph::InputId;

use super::StatefulNode;

pub struct MidiNode {
    mode: MidiOutputMode,
    note: u8,
    reset: bool,
    enabled: bool,
}

#[derive(Serialize, Deserialize, TS)]
#[ts(export)]
pub enum MidiOutputMode {
    Note,
    Gate,
}

#[derive(Serialize, Deserialize, TS)]
#[ts(export)]
pub enum MidiMessageEvent {
    // Set or change the output mode
    OutputMode(MidiOutputMode),
    // Values are 0-127 where C4 is 60
    NoteOn { value: u8 },
    NoteOff { value: u8 },
    None,
}

impl Node<InputId> for MidiNode {
    fn process(&mut self, _: &[Input<InputId>], output: &mut [Buffer]) {
        for ix in 0..Buffer::LEN {
            match self.mode {
                MidiOutputMode::Note => output[0][ix] = (self.note as f32 / 12.0) - 1.0,
                MidiOutputMode::Gate => {
                    if self.reset {
                        output[0][ix] = 0.0;
                        self.reset = false;
                    } else {
                        output[0][ix] = if self.enabled { 1.0 } else { 0.0 };
                    }
                }
            }
        }
    }
}

impl StatefulNode for MidiNode {
    type State = MidiMessageEvent;

    fn create(state: Self::State, _sample_rate: f64) -> Self {
        let mode = match state {
            MidiMessageEvent::OutputMode(m) => m,
            _ => MidiOutputMode::Gate,
        };

        Self {
            note: 0,
            enabled: false,
            reset: false,
            mode,
        }
    }

    fn update(&mut self, state: Self::State) {
        match state {
            MidiMessageEvent::NoteOn { value } => {
                self.note = value;
                self.enabled = true;
                self.reset = true;
            }
            MidiMessageEvent::NoteOff { value } => {
                if self.note == value {
                    self.enabled = false
                }
            }
            MidiMessageEvent::OutputMode(mode) => self.mode = mode,
            MidiMessageEvent::None => {}
        }
    }
}
