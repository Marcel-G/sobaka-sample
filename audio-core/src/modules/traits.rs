use crate::{graph::AudioGraph, util::state_observer::Observer};

use super::io::{Input, Output};

pub trait Module {
	type InputName;
	fn create(&mut self, core: &mut AudioGraph);
	
	fn dispose(&mut self, core: &mut AudioGraph);

	fn input(&self, name: &Self::InputName) -> Option<&Input>;

	fn output(&self) -> Option<&Output>;
}

pub trait StatefulModule {
	type State; // add constraints for serde
	fn subscribe(&self, core: &AudioGraph) -> Option<Observer<Self::State>>;

	fn update(&mut self, core: &mut AudioGraph, state: Self::State);

	fn create(&mut self, core: &mut AudioGraph, initial_state: Self::State);
}