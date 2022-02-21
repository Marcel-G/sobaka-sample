use dasp::graph::{node::Sum, Buffer, Input, Node};

use crate::graph::InputId;

#[derive(Default)]
pub struct InputNode(Sum);

impl Node<InputId> for InputNode {
    fn process(&mut self, inputs: &[Input<InputId>], output: &mut [Buffer]) {}
}
