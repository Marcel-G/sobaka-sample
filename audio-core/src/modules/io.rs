use dasp::graph::{NodeData, node::Sum};
use petgraph::graph::NodeIndex;

use crate::{graph::AudioGraph, node::AudioNode};

pub struct Input {
	pub name: &'static str,
	/// Number if connections allowed, 0 is unlimited
	pub limit: usize,
	pub node: Option<NodeIndex>
}

impl Input {
	pub fn create(name: &'static str, core: &mut AudioGraph) -> Self {
		Input {
			name,
			limit: 0,
			node: Some(core.add_node(NodeData::new1(AudioNode::Sum(Sum))))
		}
	}
	pub fn dispose(&mut self, core: &mut AudioGraph) {
		if let Some(node) = self.node {
			core.remove_node(node);
			self.node = None;
		}
	}
}

pub struct Output {
	pub name: &'static str,
	pub node: NodeIndex
}

impl Output {
	pub fn from_index(name: &'static str, node: NodeIndex) -> Self {
		Output {
			name,
			node
		}
	}
}