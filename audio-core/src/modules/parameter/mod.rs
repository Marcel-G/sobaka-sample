use crate::{
    graph::{AudioGraph, NodeIndex},
    node::AudioNode,
    util::state_observer::{ObserveState, Observer},
};

use self::node::{ParameterNode, ParameterState};

use super::{
    io::{Input, Output},
    traits::{Module, StatefulModule},
};

pub mod node;

#[derive(Default)]
pub struct ParameterModule {
    parameter: Option<NodeIndex>,
    output: Option<Output>,
}

impl ParameterModule {
    fn node<'a>(&self, core: &'a AudioGraph) -> Option<&'a ParameterNode> {
        let parameter = self.parameter.expect("Node is not initialised");
        if let Some(AudioNode::Parameter(parameter_node)) = core.get_audio_node(parameter) {
            Some(parameter_node)
        } else {
            None
        }
    }

    fn node_mut<'a>(&self, core: &'a mut AudioGraph) -> Option<&'a mut ParameterNode> {
        let parameter = self.parameter.expect("Node is not initialised");
        if let Some(AudioNode::Parameter(parameter_node)) = core.get_audio_node_mut(parameter) {
            Some(parameter_node)
        } else {
            None
        }
    }
}

impl StatefulModule for ParameterModule {
    type State = ParameterState;
    fn create(&mut self, core: &mut AudioGraph, initial_state: Self::State) {
        let parameter = core.add_node(ParameterNode::new(initial_state));

        self.output = Some(Output::from_index("Output", parameter));

        self.parameter = Some(parameter);
    }

    fn subscribe(&self, core: &AudioGraph) -> Option<Observer<Self::State>> {
        self.node(core)
            .map(|parameter_node| parameter_node.observe())
    }

    fn update(&mut self, core: &mut AudioGraph, state: Self::State) {
        if let Some(parameter_node) = self.node_mut(core) {
            parameter_node.update(state);
        }
    }
}

impl Module for ParameterModule {
    type InputName = ();
    fn dispose(&mut self, core: &mut AudioGraph) {
        if let Some(parameter) = self.parameter {
            core.remove_node(parameter);
            self.parameter = None;
            self.output = None;
        }
    }

    /// Parameter nodes have no inputs
    fn input(&self, _: &Self::InputName) -> Option<&Input> {
        None
    }

    fn output(&self) -> Option<&Output> {
        self.output.as_ref()
    }

    fn create(&mut self, core: &mut AudioGraph) {
        StatefulModule::create(self, core, ParameterState::default())
    }
}
