use std::convert::{TryFrom, TryInto};

use dasp::graph::{Buffer, Input, Node, NodeData};
use derive_more::{From, TryInto};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use self::{
    delay::DelayNode, envelope::EnvelopeNode, oscillator::OscillatorNode, parameter::ParameterNode,
    sequencer::SequencerNode, sink::SinkNode, sum::SumNode, volume::VolumeNode,
};

pub mod delay;
pub mod envelope;
pub mod oscillator;
pub mod parameter;
pub mod sequencer;
pub mod sink;
pub mod sum;
pub mod volume;

pub trait StatefulNode {
    type State;
    fn create(state: Self::State) -> Self;
    fn update(&mut self, state: Self::State);
}

use std::sync::Mutex;

use futures::channel::mpsc;

pub type Observer<S> = mpsc::UnboundedReceiver<S>;
pub type ObserverStorage<S> = Mutex<Vec<mpsc::UnboundedSender<S>>>;

pub trait EventNode {
    type Event: Clone;
    fn observers(&self) -> &ObserverStorage<Self::Event>;

    fn notify(&self, event: Self::Event) {
        let mut sinks = self.observers().lock().unwrap();

        sinks.retain(|sink| sink.unbounded_send(event.clone()).is_ok());
    }

    fn observe(&self) -> Observer<Self::Event> {
        let (sink, stream) = mpsc::unbounded();
        self.observers().lock().unwrap().push(sink);
        stream
    }
}

#[derive(From)]
pub enum AudioNode {
    Delay(DelayNode),
    Envelope(EnvelopeNode),
    Oscillator(OscillatorNode),
    Parameter(ParameterNode),
    Sequencer(SequencerNode),
    Volume(VolumeNode),
    Sum(SumNode),
    Sink(SinkNode),
}

impl Into<NodeData<AudioNode>> for AudioNode {
    fn into(self) -> NodeData<AudioNode> {
        NodeData::new1(self)
    }
}

#[derive(Clone, Serialize, Deserialize, JsonSchema, TryInto)]
pub enum AudioInput {
    Delay(<DelayNode as Node>::InputType),
    Envelope(<EnvelopeNode as Node>::InputType),
    Oscillator(<OscillatorNode as Node>::InputType),
    Parameter(<ParameterNode as Node>::InputType),
    Sequencer(<SequencerNode as Node>::InputType),
    Volume(<VolumeNode as Node>::InputType),
    Sum(<SumNode as Node>::InputType),
    Sink(<SinkNode as Node>::InputType),
}

fn filter_compatible<T>(inputs: &[Input<AudioInput>]) -> Vec<Input<T>>
where
    T: TryFrom<AudioInput>,
{
    inputs
        .iter()
        .filter_map(|i| {
            if let Ok(variant) = i.variant.clone().try_into() {
                Some(Input::new(i.buffers(), variant))
            } else {
                None
            }
        })
        .collect::<Vec<_>>()
}

impl Node for AudioNode {
    type InputType = AudioInput;

    fn process(&mut self, inputs: &[Input<Self::InputType>], output: &mut [Buffer]) {
        match self {
            AudioNode::Delay(node) => node.process(filter_compatible(inputs).as_slice(), output),
            AudioNode::Oscillator(node) => {
                node.process(filter_compatible(inputs).as_slice(), output)
            }
            AudioNode::Parameter(node) => {
                node.process(filter_compatible(inputs).as_slice(), output)
            }
            AudioNode::Sequencer(node) => {
                node.process(filter_compatible(inputs).as_slice(), output)
            }
            AudioNode::Volume(node) => node.process(filter_compatible(inputs).as_slice(), output),
            AudioNode::Envelope(node) => node.process(filter_compatible(inputs).as_slice(), output),
            AudioNode::Sum(node) => node.process(filter_compatible(inputs).as_slice(), output),
            AudioNode::Sink(node) => node.process(filter_compatible(inputs).as_slice(), output),
        }
    }
}
