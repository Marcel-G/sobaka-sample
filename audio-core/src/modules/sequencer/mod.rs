use std::collections::HashMap;

use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use crate::{
    graph::{AudioGraph, NodeIndex},
    node::AudioNode,
    util::state_observer::{ObserveState, Observer},
};

use self::node::{SequencerNode, SequencerState};

use super::{
    io::{Input, Output},
    traits::{Module, StatefulModule},
};

pub mod node;

#[derive(PartialEq, Eq, Hash, Serialize, Deserialize, JsonSchema)]
pub enum SequencerInput {
    Gate,
}

#[derive(Default)]
pub struct SequencerModule {
    inputs: HashMap<SequencerInput, Input>,
    sequencer: Option<NodeIndex>,
    output: Option<Output>,
}

impl SequencerModule {
    fn node<'a>(&self, core: &'a AudioGraph) -> Option<&'a SequencerNode> {
        let sequencer = self.sequencer.expect("Node is not initialised");
        if let Some(AudioNode::Sequencer(sequencer_node)) = core.get_audio_node(sequencer) {
            Some(sequencer_node)
        } else {
            None
        }
    }

    fn node_mut<'a>(&self, core: &'a mut AudioGraph) -> Option<&'a mut SequencerNode> {
        let sequencer = self.sequencer.expect("Node is not initialised");
        if let Some(AudioNode::Sequencer(sequencer_node)) = core.get_audio_node_mut(sequencer) {
            Some(sequencer_node)
        } else {
            None
        }
    }
}

impl StatefulModule for SequencerModule {
    type State = SequencerState;
    fn create(&mut self, core: &mut AudioGraph, initial_state: Self::State) {
        let gate = Input::create("Gate", core);

        let node = core.add_node(SequencerNode::new(initial_state));

        core.add_edge(gate.node.expect("Input not initialised"), node);

        self.inputs.insert(SequencerInput::Gate, gate);

        self.output = Some(Output::from_index("Output", node));

        self.sequencer = Some(node);
    }

    fn subscribe(&self, core: &AudioGraph) -> Option<Observer<Self::State>> {
        self.node(core)
            .map(|sequencer_node| sequencer_node.observe())
    }

    fn update(&mut self, core: &mut AudioGraph, state: Self::State) {
        if let Some(sequencer_node) = self.node_mut(core) {
            sequencer_node.update(state);
        }
    }
}

impl Module for SequencerModule {
    type InputName = SequencerInput;
    fn dispose(&mut self, core: &mut AudioGraph) {
        for (_, input) in self.inputs.iter_mut() {
            input.dispose(core);
        }
        self.inputs.clear();

        if let Some(sequencer) = self.sequencer {
            core.remove_node(sequencer);
            self.sequencer = None;
            self.output = None;
        }
    }

    fn input(&self, name: &Self::InputName) -> Option<&Input> {
        self.inputs.get(name)
    }

    fn output(&self) -> Option<&Output> {
        self.output.as_ref()
    }

    fn create(&mut self, core: &mut AudioGraph) {
        StatefulModule::create(self, core, SequencerState::default())
    }
}
