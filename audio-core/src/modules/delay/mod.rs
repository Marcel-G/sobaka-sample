use std::collections::HashMap;

use dasp::graph::NodeData;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use crate::{
    graph::{AudioGraph, NodeIndex},
    node::AudioNode,
};

use self::node::DelayNode;

use super::{
    io::{Input, Output},
    traits::Module,
};

pub mod node;

#[derive(PartialEq, Eq, Hash, Serialize, Deserialize, JsonSchema)]
pub enum DelayInput {
    Time,
    Signal,
}

#[derive(Default)]
pub struct DelayModule {
    inputs: HashMap<DelayInput, Input>,
    delay: Option<NodeIndex>,
    output: Option<Output>,
}

impl Module for DelayModule {
    type InputName = DelayInput;
    fn create(&mut self, core: &mut AudioGraph) {
        let signal = Input::create("Signal", core);
        let time = Input::create("Time", core);

        let node = DelayNode::new();

        let delay = core.add_node(NodeData::new1(AudioNode::Delay(node)));

        core.add_edge(time.node.expect("Input not initialised"), delay);
        core.add_edge(signal.node.expect("Input not initialised"), delay);

        self.inputs.insert(DelayInput::Signal, signal);
        self.inputs.insert(DelayInput::Time, time);

        self.output = Some(Output::from_index("Output", delay));

        self.delay = Some(delay);
    }

    fn dispose(&mut self, core: &mut AudioGraph) {
        for (_, input) in self.inputs.iter_mut() {
            input.dispose(core);
        }
        self.inputs.clear();

        if let Some(delay) = self.delay {
            core.remove_node(delay);
            self.delay = None;
            self.output = None;
        }
    }

    fn input(&self, name: &Self::InputName) -> Option<&Input> {
        self.inputs.get(name)
    }

    fn output(&self) -> Option<&Output> {
        self.output.as_ref()
    }
}
