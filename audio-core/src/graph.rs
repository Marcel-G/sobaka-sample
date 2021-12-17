use dasp::graph::NodeData;
use petgraph::graph::{DefaultIx, EdgeIndex as ExtEdgeIndex};

pub type NodeIndex<Ix = DefaultIx> = petgraph::graph::NodeIndex<Ix>;
pub type EdgeIndex = ExtEdgeIndex;
use crate::node::AudioNode;

const SAMPLE_RATE: f64 = 44100.;

type Graph = petgraph::stable_graph::StableGraph<NodeData<AudioNode>, ()>;
type Processor = dasp::graph::Processor<Graph>;

pub struct AudioGraph {
    pub graph: Graph,
    pub processor: Processor,
}

impl Default for AudioGraph {
    fn default() -> Self {
        Self::new()
    }
}

impl AudioGraph {
    pub fn new() -> Self {
        let max_nodes = 1024;
        let max_edges = 1024;

        let graph = Graph::with_capacity(max_nodes, max_edges);
        let processor = Processor::with_capacity(max_nodes);

        Self { graph, processor }
    }

    pub fn sample_rate(&self) -> f64 {
        SAMPLE_RATE
    }

    pub fn process(&mut self, node: NodeIndex) {
        self.processor.process(&mut self.graph, node);
    }

    pub fn add_node<T: Into<NodeData<AudioNode>>>(&mut self, into_node: T) -> NodeIndex {
        self.graph.add_node(into_node.into())
    }

    pub fn remove_node(&mut self, node: NodeIndex) -> Option<NodeData<AudioNode>> {
        self.graph.remove_node(node)
    }

    pub fn add_edge(&mut self, a: NodeIndex, b: NodeIndex) -> EdgeIndex {
        self.graph.add_edge(a, b, ())
    }

    pub fn remove_edge(&mut self, edge: EdgeIndex) {
        self.graph.remove_edge(edge);
    }

    pub fn get_audio_node(&self, node_id: NodeIndex<u32>) -> Option<&AudioNode> {
        if let Some(node_data) = self.graph.node_weight(node_id) {
            Some(&node_data.node)
        } else {
            None
        }
    }

    pub fn get_audio_node_mut(&mut self, node_id: NodeIndex<u32>) -> Option<&mut AudioNode> {
        if let Some(node_data) = self.graph.node_weight_mut(node_id) {
            Some(&mut node_data.node)
        } else {
            None
        }
    }
}

unsafe impl Send for AudioGraph {}
unsafe impl Sync for AudioGraph {}
