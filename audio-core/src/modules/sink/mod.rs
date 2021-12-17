use std::collections::HashMap;

use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use crate::graph::{AudioGraph, NodeIndex};

use super::{
    io::{Input, Output},
    traits::Module,
};

#[derive(PartialEq, Eq, Hash, Serialize, Deserialize, JsonSchema)]
pub enum SinkInput {
    Signal,
}

#[derive(Default)]
pub struct SinkModule {
    inputs: HashMap<SinkInput, Input>,
    pub sink: Option<NodeIndex>,
}

impl Module for SinkModule {
    type InputName = SinkInput;
    fn dispose(&mut self, core: &mut AudioGraph) {
        for (_, input) in self.inputs.iter_mut() {
            input.dispose(core);
        }
        self.inputs.clear();

        self.sink = None;
    }

    fn input(&self, name: &Self::InputName) -> Option<&Input> {
        self.inputs.get(name)
    }

    fn output(&self) -> Option<&Output> {
        None
    }

    fn create(&mut self, core: &mut AudioGraph) {
        let signal = Input::create("Signal", core);

        self.sink = signal.node;

        self.inputs.insert(SinkInput::Signal, signal);
    }
}
