use std::collections::HashMap;

use dasp::graph::{node::Sum, NodeData};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use crate::{
    graph::{AudioGraph, NodeIndex},
    node::AudioNode,
};

use super::{
    io::{Input, Output},
    traits::Module,
};

#[derive(PartialEq, Eq, Hash, Serialize, Deserialize, JsonSchema)]
pub enum SumInput {
    Signal,
}

#[derive(Default)]
pub struct SumModule {
    inputs: HashMap<SumInput, Input>,
    sum: Option<NodeIndex>,
    output: Option<Output>,
}

impl Module for SumModule {
    type InputName = SumInput;
    fn create(&mut self, core: &mut AudioGraph) {
        let signal = Input::create("Signal", core);

        let sum = core.add_node(NodeData::new1(AudioNode::Sum(Sum)));

        core.add_edge(signal.node.expect("Input not initialised"), sum);

        self.inputs.insert(SumInput::Signal, signal);

        self.output = Some(Output::from_index("Output", sum));

        self.sum = Some(sum);
    }

    fn dispose(&mut self, core: &mut AudioGraph) {
        for (_, input) in self.inputs.iter_mut() {
            input.dispose(core);
        }
        self.inputs.clear();

        if let Some(sum) = self.sum {
            core.remove_node(sum);
            self.sum = None;
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
