use dasp::{
    graph::{BoxedNodeSend, Buffer, Input, Node},
    Sample, Signal,
};
use enum_map::Enum;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use crate::util::input_signal::InputSignalNode;

#[derive(Clone, PartialEq, Enum, Eq, Hash, Serialize, Deserialize, JsonSchema)]
pub enum VolumeInput {
    Signal,
    Level,
}
pub struct VolumeNode(BoxedNodeSend<VolumeInput>);

impl Default for VolumeNode {
    fn default() -> Self {
        let node = InputSignalNode::new(|s| {
            s.input(VolumeInput::Signal)
                .mul_amp(s.input(VolumeInput::Level))
                .map(Sample::to_sample::<f32>)
        });

        Self(BoxedNodeSend::new(node))
    }
}

impl Node for VolumeNode {
    type InputType = VolumeInput;

    fn process(&mut self, inputs: &[Input<Self::InputType>], output: &mut [Buffer]) {
        self.0.process(inputs, output)
    }
}
