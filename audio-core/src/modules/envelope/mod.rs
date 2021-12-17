mod node;

use std::collections::HashMap;

use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use crate::{
    graph::{AudioGraph, NodeIndex},
    node::input_signal::InputSignalNode,
};

use self::node::Envelope;

const SAMPLE_RATE: f64 = 44100.;

use super::{
    io::{Input, Output},
    traits::Module,
};

#[derive(PartialEq, Eq, Hash, Serialize, Deserialize, JsonSchema)]
pub enum EnvelopeInput {
    Gate,
    Attack,
    Decay,
    Sustain,
    Release,
}

#[derive(Default)]
pub struct EnvelopeModule {
    inputs: HashMap<EnvelopeInput, Input>,
    envelope: Option<NodeIndex>,
    output: Option<Output>,
}

impl Module for EnvelopeModule {
    type InputName = EnvelopeInput;
    fn create(&mut self, core: &mut AudioGraph) {
        let gate = (EnvelopeInput::Gate, Input::create("Gate", core));
        let attack = (EnvelopeInput::Attack, Input::create("Attack", core));
        let decay = (EnvelopeInput::Decay, Input::create("Decay", core));
        let sustain = (EnvelopeInput::Sustain, Input::create("Sustain", core));
        let release = (EnvelopeInput::Release, Input::create("Release", core));

        let envelope = core.add_node(InputSignalNode::new(|[gate, a, d, s, r]| {
            Envelope::new(SAMPLE_RATE as f32, gate, a, d, s, r)
        }));

        for (name, input) in [gate, attack, decay, sustain, release] {
            core.add_edge(input.node.expect("Input not initialised"), envelope);
            self.inputs.insert(name, input);
        }

        self.output = Some(Output::from_index("Output", envelope));

        self.envelope = Some(envelope);
    }

    fn dispose(&mut self, core: &mut AudioGraph) {
        for (_, input) in self.inputs.iter_mut() {
            input.dispose(core);
        }
        self.inputs.clear();

        if let Some(envelope) = self.envelope {
            core.remove_node(envelope);
            self.envelope = None;
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
