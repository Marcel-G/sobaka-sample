use std::collections::HashMap;

use dasp::{signal, Sample, Signal};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use crate::{
    graph::{AudioGraph, NodeIndex},
    node::input_signal::InputSignalNode,
};

const SAMPLE_RATE: f64 = 44100.;

use super::{
    io::{Input, Output},
    traits::Module,
};

#[derive(PartialEq, Eq, Hash, Serialize, Deserialize, JsonSchema)]
pub enum ClockInput {
    Frequency,
}

#[derive(Default)]
pub struct ClockModule {
    inputs: HashMap<ClockInput, Input>,
    clock: Option<NodeIndex>,
    output: Option<Output>,
}

impl Module for ClockModule {
    type InputName = ClockInput;
    fn create(&mut self, core: &mut AudioGraph) {
        let frequency = Input::create("Frequency", core);

        let clock = core.add_node(InputSignalNode::new(|[frequency]| {
            signal::rate(SAMPLE_RATE)
                .hz(frequency.map(|bpm| bpm / (60.0 / 4.0)))
                .square()
                .map(Sample::to_sample::<f32>)
        }));

        core.add_edge(frequency.node.expect("Input not initialised"), clock);

        self.inputs.insert(ClockInput::Frequency, frequency);

        self.output = Some(Output::from_index("Output", clock));

        self.clock = Some(clock);
    }

    fn dispose(&mut self, core: &mut AudioGraph) {
        for (_, input) in self.inputs.iter_mut() {
            input.dispose(core);
        }
        self.inputs.clear();

        if let Some(envelope) = self.clock {
            core.remove_node(envelope);
            self.clock = None;
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
