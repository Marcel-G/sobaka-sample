use dasp::graph::{sinks, NodeData};
use petgraph::graph::{DefaultIx, EdgeIndex as ExtEdgeIndex};

pub type NodeIndex<Ix = DefaultIx> = petgraph::graph::NodeIndex<Ix>;
pub type EdgeIndex = ExtEdgeIndex;
use crate::node::{AudioInput, AudioNode};

type Graph = petgraph::stable_graph::StableGraph<NodeData<AudioNode>, AudioInput>;
type Processor = dasp::graph::Processor<Graph>;

pub struct AudioGraph {
    pub graph: Graph,
    pub processor: Processor,
    pub sample_rate: f64,
}

impl AudioGraph {
    pub fn new(sample_rate: f64) -> Self {
        let max_nodes = 1024;
        let max_edges = 1024;

        let graph = Graph::with_capacity(max_nodes, max_edges);
        let processor = Processor::with_capacity(max_nodes);

        Self {
            graph,
            processor,
            sample_rate,
        }
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

    pub fn add_edge(
        &mut self,
        source: NodeIndex,
        destination: NodeIndex,
        destination_input: &AudioInput,
    ) -> Result<EdgeIndex, &'static str> {
        if self.get_audio_node(source).is_none() {
            return Err("Source node not found");
        }
        if let Some(destination_node) = self.get_audio_node(destination) {
            match (destination_node, destination_input) {
                (AudioNode::Delay(_), AudioInput::Delay(_)) => {
                    Ok(self
                        .graph
                        .add_edge(source, destination, destination_input.clone()))
                }
                (AudioNode::Envelope(_), AudioInput::Envelope(_)) => {
                    Ok(self
                        .graph
                        .add_edge(source, destination, destination_input.clone()))
                }
                (AudioNode::Filter(_), AudioInput::Filter(_)) => {
                    Ok(self
                        .graph
                        .add_edge(source, destination, destination_input.clone()))
                }
                (AudioNode::Oscillator(_), AudioInput::Oscillator(_)) => {
                    Ok(self
                        .graph
                        .add_edge(source, destination, destination_input.clone()))
                }
                (AudioNode::Parameter(_), AudioInput::Parameter(_)) => {
                    Ok(self
                        .graph
                        .add_edge(source, destination, destination_input.clone()))
                }
                (AudioNode::Quantiser(_), AudioInput::Quantiser(_)) => {
                    Ok(self
                        .graph
                        .add_edge(source, destination, destination_input.clone()))
                }
                (AudioNode::Reverb(_), AudioInput::Reverb(_)) => {
                    Ok(self
                        .graph
                        .add_edge(source, destination, destination_input.clone()))
                }
                (AudioNode::SampleAndHold(_), AudioInput::SampleAndHold(_)) => Ok(self
                    .graph
                    .add_edge(source, destination, destination_input.clone())),
                (AudioNode::Sequencer(_), AudioInput::Sequencer(_)) => {
                    Ok(self
                        .graph
                        .add_edge(source, destination, destination_input.clone()))
                }
                (AudioNode::Sink(_), AudioInput::Sink(_)) => {
                    Ok(self
                        .graph
                        .add_edge(source, destination, destination_input.clone()))
                }
                (AudioNode::Sum(_), AudioInput::Sum(_)) => {
                    Ok(self
                        .graph
                        .add_edge(source, destination, destination_input.clone()))
                }
                (AudioNode::Volume(_), AudioInput::Volume(_)) => {
                    Ok(self
                        .graph
                        .add_edge(source, destination, destination_input.clone()))
                }
                _ => Err("Input not compatible with destination node"),
            }
        } else {
            Err("Destination node not found")
        }
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

    pub fn sinks(&self) -> Vec<NodeIndex> {
        sinks(&self.graph)
            .filter(|n| matches!(self.get_audio_node(*n), Some(AudioNode::Sink(_))))
            .collect()
    }
}

unsafe impl Send for AudioGraph {}
unsafe impl Sync for AudioGraph {}
