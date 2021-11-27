use std::collections::HashMap;

use dasp::{Sample, Signal, graph::{NodeData, node::Pass}, signal};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use crate::{ node::{AudioNode}, graph::{AudioGraph, NodeIndex}, node::input_signal::InputSignalNode, util::state_observer::{ObserveState, Observer, ObserverStorage}};

use super::{io::{Input, Output}, traits::{Module, StatefulModule}};

const SAMPLE_RATE: f64 = 44100.;

#[derive(PartialEq, Eq, Hash, Serialize, Deserialize, JsonSchema)]
pub enum OscillatorInput {
    Frequency,
}

#[derive(PartialEq, Clone, Serialize, Deserialize, JsonSchema)]
pub enum OscillatorWave {
	Saw,
	Square,
	Sine,
	Noise
}

impl Default for OscillatorWave {
    fn default() -> Self {
			OscillatorWave::Sine
    }
}

#[derive(Default, Serialize, Deserialize, JsonSchema)]
pub struct OscillatorState {
	wave: OscillatorWave
}

#[derive(Default)]
pub struct OscillatorModule {
    inputs: HashMap<OscillatorInput, Input>,
    oscillator: Option<NodeIndex>,
		wave: OscillatorWave,
    output: Option<Output>,
    observers: ObserverStorage<OscillatorState>,
}

impl OscillatorModule {
	fn create_sin(&mut self, core: &mut AudioGraph) -> NodeIndex {
		core.add_node(
			InputSignalNode::new(|[frequency]| {
				signal::rate(SAMPLE_RATE)
					.hz(frequency)
					.sine()
					.map(Sample::to_sample::<f32>)
			})
		)
	}

	fn create_saw(&mut self, core: &mut AudioGraph) -> NodeIndex {
		core.add_node(
			InputSignalNode::new(|[frequency]| {
				signal::rate(SAMPLE_RATE)
					.hz(frequency)
					.saw()
					.map(Sample::to_sample::<f32>)
			})
		)
	}

	fn create_square(&mut self, core: &mut AudioGraph) -> NodeIndex {
		core.add_node(
			InputSignalNode::new(|[frequency]| {
				signal::rate(SAMPLE_RATE)
					.hz(frequency)
					.square()
					.map(Sample::to_sample::<f32>)
			})
		)
	}

	fn create_noise(&mut self, core: &mut AudioGraph) -> NodeIndex {
		core.add_node(
			InputSignalNode::new(|[frequency]| {
				signal::rate(SAMPLE_RATE)
					.hz(frequency)
					.noise_simplex()
					.map(Sample::to_sample::<f32>)
			})
		)
	}
}

impl StatefulModule for OscillatorModule {
    type State = OscillatorState;

    fn subscribe(&self, _: &AudioGraph) -> Option<Observer<Self::State>> {
			Some(self.observe())
    }

    fn update(&mut self, core: &mut AudioGraph, state: Self::State) {
			if self.wave != state.wave {
				let new_oscillator = match state.wave {
					OscillatorWave::Saw => self.create_saw(core),
					OscillatorWave::Square => self.create_square(core),
					OscillatorWave::Sine => self.create_sin(core),
					OscillatorWave::Noise => self.create_noise(core),
				};

      	core.add_edge(
					self.input(&OscillatorInput::Frequency).expect("Input not initialised").node.unwrap(),
					new_oscillator
				);

      	core.add_edge(
					new_oscillator,
					self.output.as_ref().expect("Output is not initialised").node
				);

				let oscillator = self.oscillator.expect("Module is not initialised");
				core.remove_node(oscillator);

				self.oscillator = Some(new_oscillator);
				self.wave = state.wave;
				self.notify();
			}
    }

    fn create(&mut self, core: &mut AudioGraph, initial_state: Self::State) {
      let frequency = Input::create("Frequency", core);
			let output = core.add_node(NodeData::new1(AudioNode::Pass(Pass)));

			let oscillator = match initial_state.wave {
				OscillatorWave::Saw => self.create_saw(core),
				OscillatorWave::Square => self.create_square(core),
				OscillatorWave::Sine => self.create_sin(core),
				OscillatorWave::Noise => self.create_noise(core),
			};

      core.add_edge(frequency.node.expect("Input not initialised"), oscillator);
      core.add_edge(oscillator, output);

			self.inputs.insert(OscillatorInput::Frequency, frequency);

      self.output = Some(Output::from_index("Output", output));

      self.oscillator = Some(oscillator);
    }
}

impl Module for OscillatorModule {
    type InputName = OscillatorInput;
    fn create(&mut self, core: &mut AudioGraph) {
			StatefulModule::create(self, core, OscillatorState::default())
    }

    fn dispose(&mut self, core: &mut AudioGraph) {
        for (_, input) in self.inputs.iter_mut() {
            input.dispose(core);
        }
				self.inputs.clear();

        if let Some(envelope) = self.oscillator {
            core.remove_node(envelope);
            self.oscillator = None;
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

impl ObserveState for OscillatorModule {
	type State = OscillatorState;

	fn observers(&self) -> &ObserverStorage<Self::State> {
			&self.observers
	}

	fn to_state(&self) -> Self::State {
		OscillatorState {
			wave: self.wave.clone()
		}
	}
}


