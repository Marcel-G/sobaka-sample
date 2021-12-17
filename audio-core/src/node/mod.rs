use dasp::graph::{
    node::{Pass, Sum},
    BoxedNodeSend, Buffer, Input, Node,
};

use crate::modules::{parameter::node::ParameterNode, sequencer::node::SequencerNode};

pub mod input_signal;

#[impl_enum::with_methods {
    fn process(&mut self, inputs: &[Input], output: &mut [Buffer]) {}
}]
pub enum AudioNode {
    Parameter(ParameterNode),
    Signal(BoxedNodeSend),
    Sequencer(SequencerNode),
    Sum(Sum),
    Pass(Pass),
}

impl Node for AudioNode {
    fn process(&mut self, inputs: &[Input], output: &mut [Buffer]) {
        self.process(inputs, output);
    }
}
