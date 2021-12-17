use graph::AudioGraph;
use modules::AudioModule;

pub mod graph;
pub mod modules;
pub mod node;
pub mod util;

pub struct AudioCore {
    pub graph: AudioGraph,
    pub modules: Vec<AudioModule>,
}

impl Default for AudioCore {
    fn default() -> Self {
        Self::new()
    }
}

impl AudioCore {
    pub fn new() -> Self {
        AudioCore {
            graph: AudioGraph::new(),
            modules: Default::default(),
        }
    }
}
