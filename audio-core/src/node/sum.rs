use dasp::graph::{node::Sum, Buffer, Input, Node};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

#[derive(Default)]
pub struct SumNode(Sum);

#[derive(Clone, PartialEq, Eq, Hash, Serialize, Deserialize, JsonSchema)]
pub enum SumInput {
    Signal,
}

fn map_into(inputs: &[Input<SumInput>]) -> Vec<Input> {
    inputs
        .iter()
        .map(|i| Input::new(i.buffers(), ()))
        .collect::<Vec<_>>()
}

impl Node for SumNode {
    type InputType = SumInput;

    fn process(&mut self, inputs: &[Input<Self::InputType>], output: &mut [Buffer]) {
        self.0.process(map_into(inputs).as_slice(), output)
    }
}
