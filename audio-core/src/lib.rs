use graph::AudioGraph;
use modules::AudioModule;

pub mod graph;
pub mod util;
pub mod node;
pub mod modules;


pub struct AudioCore {
	pub graph: AudioGraph,
  pub modules: Vec<AudioModule>
}

impl AudioCore {
	pub fn new() -> Self {
		AudioCore {
			graph: AudioGraph::new(),
      modules: Default::default()
		}
	}
}