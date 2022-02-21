use dasp::graph::{Buffer, Input, Node};
use serde::{Deserialize, Serialize};
use strum_macros::IntoStaticStr;
use ts_rs::TS;

use crate::graph::InputId;

use super::{EventNode, ObserverStorage, StatefulNode};

/// SequencerNode accepts the clock and will forward the pulse
/// on as output depending on the sequence configured
pub struct SequencerNode {
    step: usize,
    sequence: Vec<bool>,
    observers: ObserverStorage<SequencerEvent>,
    is_rising: bool, // @todo rename this
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Default, TS)]
#[ts(export)]
pub struct SequencerState {
    pub step: usize,
    pub sequence: Vec<bool>,
}

#[derive(Clone, Serialize, Deserialize, TS, IntoStaticStr)]
#[ts(export)]
pub enum SequencerInput {
    Gate,
}

#[derive(Clone, PartialEq, Eq, Hash, Serialize, Deserialize, TS)]
#[ts(export)]
pub enum SequencerEvent {
    StepChange { step: usize },
}

impl SequencerNode {
    pub fn new(initial_state: SequencerState) -> Self {
        SequencerNode {
            step: initial_state.step,
            sequence: initial_state.sequence,
            is_rising: false,
            observers: Default::default(),
        }
    }

    fn step(&mut self) {
        if self.step >= self.sequence.len() - 1 {
            self.step = 0;
        } else {
            self.step += 1;
        }
        self.notify(SequencerEvent::StepChange { step: self.step });
    }

    pub fn reset(&mut self) {
        self.step = 0;
        self.notify(SequencerEvent::StepChange { step: 0 });
    }

    pub fn update(&mut self, new_state: SequencerState) {
        self.sequence = new_state.sequence;
        self.step = new_state.step;
    }

    fn should_trigger(&self) -> bool {
        match self.sequence.get(self.step) {
            Some(value) => *value,
            None => false,
        }
    }
}

impl EventNode for SequencerNode {
    type Event = SequencerEvent;

    fn observers(&self) -> &ObserverStorage<Self::Event> {
        &self.observers
    }
}

impl Node<InputId> for SequencerNode {
    fn process(&mut self, inputs: &[Input<InputId>], output: &mut [Buffer]) {
        // Fill the output with silence.
        for out_buffer in output.iter_mut() {
            out_buffer.silence();
        }

        if let Some(clock) = inputs.get(0) {
            let clock_buffers = clock.buffers();
            for ix in 0..Buffer::LEN {
                let clock_frame = clock_buffers[0][ix];
                if clock_frame == 1.0 {
                    if self.is_rising {
                        self.step();
                    }
                    if self.should_trigger() {
                        output[0][ix] = 1.0;
                    }
                    self.is_rising = false;
                } else {
                    self.is_rising = true;
                }
            }
        }
    }
}

impl StatefulNode for SequencerNode {
    type State = SequencerState;

    fn create(state: Self::State, _sample_rate: f64) -> Self {
        Self::new(state)
    }

    fn update(&mut self, state: Self::State) {
        self.update(state)
    }
}
