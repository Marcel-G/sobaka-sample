use std::convert::{TryFrom, TryInto};

use dasp::graph::{Buffer, Input, Node, NodeData};
use derive_more::{From, TryInto};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use self::{
    delay::DelayNode, envelope::EnvelopeNode, filter::node::FilterNode, noise::NoiseNode,
    oscillator::OscillatorNode, parameter::ParameterNode, quantiser::QuantiserNode,
    reverb::ReverbNode, sample_and_hold::SampleAndHoldNode, sequencer::SequencerNode,
    sink::SinkNode, sum::SumNode, volume::VolumeNode,
};

pub mod delay;
pub mod envelope;
pub mod filter;
pub mod noise;
pub mod oscillator;
pub mod parameter;
pub mod quantiser;
pub mod reverb;
pub mod sample_and_hold;
pub mod sequencer;
pub mod sink;
pub mod sum;
pub mod volume;

pub trait StatefulNode {
    type State;
    fn create(state: Self::State, sample_rate: f64) -> Self;
    fn update(&mut self, state: Self::State);
}

use futures::channel::mpsc;
use std::sync::Mutex;

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
    Filter(FilterNode),
    Noise(NoiseNode),
    Oscillator(OscillatorNode),
    Parameter(ParameterNode),
    Quantiser(QuantiserNode),
    Reverb(ReverbNode),
    SampleAndHold(SampleAndHoldNode),
    Sequencer(SequencerNode),
    Sink(SinkNode),
    Sum(SumNode),
    Volume(VolumeNode),
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
    Filter(<FilterNode as Node>::InputType),
    Noise(<NoiseNode as Node>::InputType),
    Oscillator(<OscillatorNode as Node>::InputType),
    Parameter(<ParameterNode as Node>::InputType),
    Quantiser(<QuantiserNode as Node>::InputType),
    Reverb(<ReverbNode as Node>::InputType),
    SampleAndHold(<SampleAndHoldNode as Node>::InputType),
    Sequencer(<SequencerNode as Node>::InputType),
    Sink(<SinkNode as Node>::InputType),
    Sum(<SumNode as Node>::InputType),
    Volume(<VolumeNode as Node>::InputType),
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
            AudioNode::Envelope(node) => node.process(filter_compatible(inputs).as_slice(), output),
            AudioNode::Filter(node) => node.process(filter_compatible(inputs).as_slice(), output),
            AudioNode::Noise(node) => node.process(filter_compatible(inputs).as_slice(), output),
            AudioNode::Oscillator(node) => {
                node.process(filter_compatible(inputs).as_slice(), output)
            }
            AudioNode::Parameter(node) => {
                node.process(filter_compatible(inputs).as_slice(), output)
            }
            AudioNode::Quantiser(node) => {
                node.process(filter_compatible(inputs).as_slice(), output)
            }
            AudioNode::Reverb(node) => node.process(filter_compatible(inputs).as_slice(), output),
            AudioNode::SampleAndHold(node) => {
                node.process(filter_compatible(inputs).as_slice(), output)
            }
            AudioNode::Sequencer(node) => {
                node.process(filter_compatible(inputs).as_slice(), output)
            }
            AudioNode::Sink(node) => node.process(filter_compatible(inputs).as_slice(), output),
            AudioNode::Sum(node) => node.process(filter_compatible(inputs).as_slice(), output),
            AudioNode::Volume(node) => node.process(filter_compatible(inputs).as_slice(), output),
        }
    }
}
