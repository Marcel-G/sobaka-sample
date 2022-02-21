use dasp::graph::{node::Sum, Buffer, Input, Node};
use serde::{Deserialize, Serialize};
use strum_macros::IntoStaticStr;
use ts_rs::TS;

use crate::graph::InputId;

#[derive(Default)]
pub struct SinkNode(Sum);

#[derive(Clone, PartialEq, Eq, Hash, Serialize, Deserialize, TS, IntoStaticStr)]
#[ts(export)]
pub enum SinkInput {
    Signal,
}

fn map_into(inputs: &[Input<InputId>]) -> Vec<Input> {
    inputs
        .iter()
        .map(|i| Input::new(i.buffers(), ()))
        .collect::<Vec<_>>()
}

impl Node<InputId> for SinkNode {
    fn process(&mut self, inputs: &[Input<InputId>], output: &mut [Buffer]) {
        self.0.process(map_into(inputs).as_slice(), output)
    }
}
