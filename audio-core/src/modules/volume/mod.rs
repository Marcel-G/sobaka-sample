use std::collections::HashMap;

use dasp::{Sample, Signal};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use crate::{
    graph::{AudioGraph, NodeIndex},
    node::input_signal::InputSignalNode,
};

use super::{
    io::{Input, Output},
    traits::Module,
};

#[derive(PartialEq, Eq, Hash, Serialize, Deserialize, JsonSchema)]
pub enum VolumeInput {
    Vc,
    Signal,
    Level,
}

#[derive(Default)]
pub struct VolumeModule {
    inputs: HashMap<VolumeInput, Input>,
    volume: Option<NodeIndex>,
    output: Option<Output>,
}

impl Module for VolumeModule {
    type InputName = VolumeInput;
    fn create(&mut self, core: &mut AudioGraph) {
        let signal = (VolumeInput::Signal, Input::create("Signal", core));
        let vc = (VolumeInput::Vc, Input::create("Vc", core));
        let level = (VolumeInput::Level, Input::create("Level", core));

        let volume = core.add_node(
            InputSignalNode::new(|[signal, vc, level]| {
                signal
                    .mul_amp(vc)
                    .mul_amp(level)
                    .map(Sample::to_sample::<f32>)
            })
        );

        for (name, input) in [signal, vc, level] {
            core.add_edge(input.node.expect("Input not initialised"), volume);
            self.inputs.insert(name, input);
        }

        self.output = Some(Output::from_index("Output", volume));

        self.volume = Some(volume);
    }

    fn dispose(&mut self, core: &mut AudioGraph) {
        for (_, input) in self.inputs.iter_mut() {
            input.dispose(core);
        }
        self.inputs.clear();

        if let Some(volume) = self.volume {
            core.remove_node(volume);
            self.volume = None;
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