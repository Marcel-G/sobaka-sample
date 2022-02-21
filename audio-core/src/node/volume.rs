use dasp::{
    graph::{BoxedNodeSend, Buffer, Input, Node},
    Sample, Signal,
};
use serde::{Deserialize, Serialize};
use strum_macros::{EnumIter, IntoStaticStr};
use ts_rs::TS;

use crate::{graph::InputId, util::input_signal::InputSignalNode};

#[derive(Clone, PartialEq, Serialize, Deserialize, TS, IntoStaticStr, EnumIter)]
#[ts(export)]
pub enum VolumeInput {
    Signal,
    Level,
}
pub struct VolumeNode(BoxedNodeSend<InputId>);

impl Default for VolumeNode {
    fn default() -> Self {
        let node = InputSignalNode::<VolumeInput, _>::new(|s| {
            s.input(VolumeInput::Signal)
                .mul_amp(s.input(VolumeInput::Level))
                .map(Sample::to_sample::<f32>)
        });

        Self(BoxedNodeSend::new(node))
    }
}

impl Node<InputId> for VolumeNode {
    fn process(&mut self, inputs: &[Input<InputId>], output: &mut [Buffer]) {
        self.0.process(inputs, output)
    }
}
