use dasp::graph::{node::Sum, Buffer, Input, Node};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

#[derive(Default)]
pub struct SinkNode(Sum);

#[derive(Clone, PartialEq, Eq, Hash, Serialize, Deserialize, JsonSchema)]
pub enum SinkInput {
    Signal,
}

fn map_into(inputs: &[Input<SinkInput>]) -> Vec<Input> {
    inputs
        .iter()
        .map(|i| Input::new(i.buffers(), ()))
        .collect::<Vec<_>>()
}

impl Node for SinkNode {
    type InputType = SinkInput;

    fn process(&mut self, inputs: &[Input<Self::InputType>], output: &mut [Buffer]) {
        self.0.process(map_into(inputs).as_slice(), output)
    }
}
