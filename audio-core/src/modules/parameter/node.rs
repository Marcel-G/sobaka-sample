use crate::util::state_observer::{ObserveState, ObserverStorage};
use dasp::{
    graph::{Buffer, Input, Node, NodeData},
    Signal,
};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use super::AudioNode;

pub struct ParameterNode {
    pub range: (f32, f32),
    pub value: f32,
    current_value: f32,
    observers: ObserverStorage<ParameterState>,
}

#[derive(Default, Serialize, Deserialize, JsonSchema)]
pub struct ParameterState {
    pub range: (f32, f32),
    pub value: f32,
}

impl ParameterNode {
    pub fn new(state: ParameterState) -> Self {
        let range = state.range;
        Self {
            value: state.value.clamp(range.0, range.1),
            current_value: 0.0,
            range,
            observers: Default::default(),
        }
    }

    pub fn update(&mut self, state: ParameterState) {
        let value = state.value;
        self.range = state.range;
        self.value = value.clamp(self.range.0, self.range.1);
        self.notify();
    }
}

impl ObserveState for ParameterNode {
    type State = ParameterState;

    fn observers(&self) -> &ObserverStorage<Self::State> {
        &self.observers
    }

    fn to_state(&self) -> Self::State {
        ParameterState {
            range: self.range,
            value: self.value,
        }
    }
}

impl Signal for ParameterNode {
    type Frame = f32;

    fn next(&mut self) -> Self::Frame {
        if (self.current_value - self.value).abs() > 0.005 {
            self.current_value += (self.value - self.current_value) * 0.25;
        } else {
            self.current_value = self.value;
        }

        self.current_value
    }
}

impl Node for ParameterNode {
    fn process(&mut self, inputs: &[Input], output: &mut [Buffer]) {
        (self as &mut (dyn Signal<Frame = f32> + Send)).process(inputs, output)
    }
}

impl From<ParameterNode> for NodeData<AudioNode> {
    fn from(node: ParameterNode) -> Self {
        NodeData::new1(AudioNode::Parameter(node))
    }
}

#[test]
fn test_parameter() {
    let parameter = ParameterNode::new(ParameterState {
        value: 1.0,
        range: (0.0, 1.0),
    });

    let result = parameter.take(20).collect::<Vec<_>>();

    assert_eq!(
        result,
        vec![
            0.25, 0.4375, 0.578125, 0.68359375, 0.7626953, 0.8220215, 0.8665161, 0.8998871,
            0.9249153, 0.9436865, 0.95776486, 0.96832365, 0.9762427, 0.982182, 0.9866365,
            0.98997736, 0.992483, 0.99436224, 0.99577165, 1.0
        ]
    );
}
