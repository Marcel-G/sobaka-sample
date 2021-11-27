use dasp::graph::{Buffer, Input, Node, NodeData};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use crate::{node::AudioNode, util::state_observer::{ObserveState, ObserverStorage}};

/// SequencerNode accepts the clock and will forward the pulse
/// on as output depending on the sequence configured
pub struct SequencerNode {
    step: usize,
    sequence: Vec<bool>,
    observers: ObserverStorage<SequencerState>,
    is_rising: bool, // @todo rename this
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Default, JsonSchema)]
pub struct SequencerState {
  pub step: usize,
  pub sequence: Vec<bool>,
}

impl SequencerNode {
    pub fn new(initial_state: SequencerState) -> Self {
        SequencerNode {
            step: initial_state.step,
            sequence: initial_state.sequence,
            is_rising: false,
            observers: Default::default()
        }
    }

    fn step(&mut self) {
      if self.step >= self.sequence.len() - 1 {
        self.step = 0;
      } else {
        self.step += 1;
      }
      self.notify();
    }

    pub fn reset(&mut self) {
      self.step = 0;
      self.notify();
    }

    pub fn update(&mut self, new_state: SequencerState) {
      self.sequence = new_state.sequence;
      self.step = new_state.step;
      self.notify();
    }

    fn should_trigger(&self) -> bool {
      match self.sequence.get(self.step) {
        Some(value) => *value,
        None => false
      }
    }
}

impl ObserveState for SequencerNode {
    type State = SequencerState;

    fn observers(&self) -> &ObserverStorage<Self::State> {
      &self.observers
    }

    fn to_state(&self) -> Self::State {
      SequencerState {
        step: self.step,
        sequence: self.sequence.clone()
      }
    }
}

impl Node for SequencerNode {
    fn process(&mut self, inputs: &[Input], output: &mut [Buffer]) {
        // Fill the output with silence.
        for out_buffer in output.iter_mut() {
            out_buffer.silence();
        }

        if let Some(clock) = inputs.get(0) {
          let clock_buffers = clock.buffers();
            for ix in 0..Buffer::LEN {
                let clock_frame = clock_buffers[0][ix];
                if clock_frame == 1.0 {
                  if self.should_trigger() {
                    output[0][ix] = 1.0;
                  }
                  if self.is_rising {
                    self.step();
                  }
                  self.is_rising = false;
                } else {
                  self.is_rising = true;
                }
            }
        }
    }
}

impl Into<NodeData<AudioNode>> for SequencerNode {
    fn into(self) -> NodeData<AudioNode> {
        NodeData::new1(AudioNode::Sequencer(self))
    }
}
