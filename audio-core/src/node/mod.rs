use dasp::graph::{Buffer, Input, Node, NodeData};
use derive_more::From;
use serde::{Deserialize, Serialize};
use strum_macros::{AsRefStr, IntoStaticStr};
use ts_rs::TS;

use crate::graph::InputId;

use self::{
    delay::{DelayInput, DelayNode},
    envelope::{EnvelopeInput, EnvelopeNode},
    filter::node::{FilterInput, FilterNode, FilterState},
    input::InputNode,
    midi::{MidiMessageEvent, MidiNode},
    noise::NoiseNode,
    oscillator::{OscillatorInput, OscillatorNode, OscillatorState},
    parameter::{ParameterInput, ParameterNode, ParameterState},
    quantiser::{QuantiserInput, QuantiserNode, QuantiserState},
    reverb::{ReverbInput, ReverbNode},
    sample_and_hold::{SampleAndHoldInput, SampleAndHoldNode},
    sampler::{SamplerInput, SamplerNode, SamplerState},
    sequencer::{SequencerEvent, SequencerInput, SequencerNode, SequencerState},
    sink::{SinkInput, SinkNode},
    sum::{SumInput, SumNode},
    volume::{VolumeInput, VolumeNode},
};

pub mod delay;
pub mod envelope;
pub mod filter;
pub mod input;
pub mod midi;
pub mod noise;
pub mod oscillator;
pub mod parameter;
pub mod quantiser;
pub mod reverb;
pub mod sample_and_hold;
pub mod sampler;
pub mod sequencer;
pub mod sink;
pub mod sum;
pub mod volume;

// Base nodes

#[derive(IntoStaticStr, From)]
#[impl_enum::with_methods {
    fn process(&mut self, inputs: &[Input<InputId>], output: &mut [Buffer]) {}
}]
pub enum AudioNode {
    Delay(DelayNode),
    Envelope(EnvelopeNode),
    Input(InputNode),
    Midi(MidiNode),
    Filter(FilterNode),
    Noise(NoiseNode),
    Oscillator(OscillatorNode),
    Parameter(ParameterNode),
    Quantiser(QuantiserNode),
    Reverb(ReverbNode),
    SampleAndHold(SampleAndHoldNode),
    Sampler(SamplerNode),
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

impl Node<InputId> for AudioNode {
    fn process(&mut self, inputs: &[Input<InputId>], output: &mut [Buffer]) {
        self.process(inputs, output)
    }
}

// Node inputs

#[derive(Serialize, Deserialize, TS, AsRefStr)]
#[serde(tag = "node_type", content = "data")]
#[ts(export)]
#[impl_enum::with_methods {
    fn into(self) -> &'static str {}
}]
pub enum AudioNodeInput {
    Delay(DelayInput),
    Envelope(EnvelopeInput),
    Filter(FilterInput),
    Oscillator(OscillatorInput),
    Parameter(ParameterInput),
    Quantiser(QuantiserInput),
    Reverb(ReverbInput),
    SampleAndHold(SampleAndHoldInput),
    Sampler(SamplerInput),
    Sequencer(SequencerInput),
    Sink(SinkInput),
    Sum(SumInput),
    Volume(VolumeInput),
}

// This is a little bit hazardous but:
// - AudioNodeInput.as_ref() -> - will return the varient name, eg 'Delay' str
// - AudioNodeInput.into() -> &'static str - will return the string of the varients data
impl Into<&'static str> for AudioNodeInput {
    fn into(self) -> &'static str {
        self.into()
    }
}

/// Node state
pub trait StatefulNode {
    type State;
    type Result = ();
    fn create(state: Self::State, sample_rate: f64) -> Self;
    fn update(&mut self, state: Self::State) -> Self::Result;
}

#[derive(Serialize, Deserialize, TS)]
#[serde(tag = "node_type", content = "data")]
#[ts(export)]
pub enum AudioNodeState {
    Delay,
    Envelope,
    Filter(FilterState),
    Input,
    Midi(MidiMessageEvent),
    Noise,
    Oscillator(OscillatorState),
    Parameter(ParameterState),
    Quantiser(QuantiserState),
    Reverb,
    SampleAndHold,
    Sampler(SamplerState),
    Sequencer(SequencerState),
    Sink,
    Sum,
    Volume,
}

impl StatefulNode for AudioNode {
    type State = AudioNodeState;
    type Result = Result<(), String>;

    fn create(state: Self::State, sr: f64) -> Self {
        match state {
            AudioNodeState::Delay => DelayNode::new(sr).into(),
            AudioNodeState::Envelope => EnvelopeNode::new(sr).into(),
            AudioNodeState::Filter(state) => FilterNode::create(state, sr).into(),
            AudioNodeState::Input => InputNode::default().into(),
            AudioNodeState::Midi(state) => MidiNode::create(state, sr).into(),
            AudioNodeState::Noise => NoiseNode::default().into(),
            AudioNodeState::Oscillator(state) => OscillatorNode::create(state, sr).into(),
            AudioNodeState::Parameter(state) => ParameterNode::create(state, sr).into(),
            AudioNodeState::Quantiser(state) => QuantiserNode::create(state, sr).into(),
            AudioNodeState::Reverb => ReverbNode::default().into(),
            AudioNodeState::SampleAndHold => SampleAndHoldNode::default().into(),
            AudioNodeState::Sampler(state) => SamplerNode::create(state, sr).into(),
            AudioNodeState::Sequencer(state) => SequencerNode::create(state, sr).into(),
            AudioNodeState::Sink => SinkNode::default().into(),
            AudioNodeState::Sum => SumNode::default().into(),
            AudioNodeState::Volume => VolumeNode::default().into(),
        }
    }

    fn update(&mut self, state: Self::State) -> Result<(), String> {
        match (self, state) {
            (AudioNode::Filter(node), AudioNodeState::Filter(state)) => Ok(node.update(state)),
            (AudioNode::Oscillator(node), AudioNodeState::Oscillator(state)) => {
                Ok(node.update(state))
            }
            (AudioNode::Midi(node), AudioNodeState::Midi(state)) => Ok(node.update(state)),
            (AudioNode::Parameter(node), AudioNodeState::Parameter(state)) => {
                Ok(node.update(state))
            }
            (AudioNode::Sampler(node), AudioNodeState::Sampler(state)) => Ok(node.update(state)),
            (AudioNode::Quantiser(node), AudioNodeState::Quantiser(state)) => {
                Ok(node.update(state))
            }
            (AudioNode::Sequencer(node), AudioNodeState::Sequencer(state)) => {
                Ok(node.update(state))
            }
            _ => Err(String::from("Could not update node")),
        }
    }
}

/// Node events
use futures::{channel::mpsc, Stream, StreamExt};
use std::{pin::Pin, sync::Mutex};

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

#[derive(Serialize, Deserialize, TS, Clone)]
#[serde(tag = "node_type", content = "data")]
#[ts(export)]
pub enum AudioNodeEvent {
    Sequencer(SequencerEvent),
}

impl AudioNode {
    pub fn observe(&self) -> Result<Pin<Box<dyn Stream<Item = AudioNodeEvent> + Send>>, String> {
        match self {
            AudioNode::Sequencer(node) => Ok(node.observe().map(AudioNodeEvent::Sequencer).boxed()),
            _ => Err(String::from("Node does not support subscriptions")),
        }
    }
}
