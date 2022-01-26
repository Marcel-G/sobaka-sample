use dasp::{
    graph::{BoxedNodeSend, Buffer, Input, Node},
    Sample, Signal,
};
use enum_map::Enum;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use crate::util::input_signal::InputSignalNode;

const SAMPLE_RATE: f64 = 44100.;
struct Envelope<G, A, D, S, R>
where
    G: Signal<Frame = f64>,
    A: Signal<Frame = f64>,
    D: Signal<Frame = f64>,
    S: Signal<Frame = f64>,
    R: Signal<Frame = f64>,
{
    rate: f32,
    gate: G,
    attack: A,
    decay: D,
    sustain: S,
    release: R,
    value: f32,
    is_decaying: bool,
}

impl<G, A, D, S, R> Envelope<G, A, D, S, R>
where
    G: Signal<Frame = f64>,
    A: Signal<Frame = f64>,
    D: Signal<Frame = f64>,
    S: Signal<Frame = f64>,
    R: Signal<Frame = f64>,
{
    pub fn new(rate: f32, gate: G, attack: A, decay: D, sustain: S, release: R) -> Self {
        Self {
            rate,
            gate,
            attack,
            decay,
            sustain,
            release,
            value: 0.0,
            is_decaying: false,
        }
    }
}

impl<G, A, D, S, R> Signal for Envelope<G, A, D, S, R>
where
    G: Signal<Frame = f64>,
    A: Signal<Frame = f64>,
    D: Signal<Frame = f64>,
    S: Signal<Frame = f64>,
    R: Signal<Frame = f64>,
{
    type Frame = f32;

    fn next(&mut self) -> Self::Frame {
        let is_gated = self.gate.next() >= 1.0;

        let attack: f32 = self.attack.next().to_sample();
        let decay: f32 = self.decay.next().to_sample();
        let sustain: f32 = self.sustain.next().to_sample();
        let release: f32 = self.release.next().to_sample();

        const BASE: f32 = 20000.0;
        const MAX_TIME: f32 = 20.0;
        let step = 1.0 / self.rate;

        if is_gated {
            if self.is_decaying {
                self.value += BASE.powf(1.0 - decay) / MAX_TIME * (sustain - self.value) * step;
            } else {
                self.value += BASE.powf(1.0 - attack) / MAX_TIME * (1.01 - self.value) * step;
                if self.value >= 1.0 {
                    self.value = 1.0;
                    self.is_decaying = true;
                }
            }
        } else {
            self.value += BASE.powf(1.0 - release) / MAX_TIME * (0.0 - self.value) * step;
            self.is_decaying = false;
        }

        self.value
    }
}

#[derive(PartialEq, Eq, Hash, Clone, Enum, Serialize, Deserialize, JsonSchema)]
pub enum EnvelopeInput {
    Gate,
    Attack,
    Decay,
    Sustain,
    Release,
}

pub struct EnvelopeNode(BoxedNodeSend<EnvelopeInput>);

impl Default for EnvelopeNode {
    fn default() -> Self {
        let node = InputSignalNode::new(|s| {
            Envelope::new(
                SAMPLE_RATE as f32,
                s.input(EnvelopeInput::Gate),
                s.input(EnvelopeInput::Attack),
                s.input(EnvelopeInput::Decay),
                s.input(EnvelopeInput::Sustain),
                s.input(EnvelopeInput::Release),
            )
        });

        Self(BoxedNodeSend::new(node))
    }
}

impl Node for EnvelopeNode {
    type InputType = EnvelopeInput;

    fn process(&mut self, inputs: &[Input<Self::InputType>], output: &mut [Buffer]) {
        self.0.process(inputs, output)
    }
}

#[test]
fn test_envelope() {
    use dasp::signal;
    const RATE: f32 = 20.;
    let envelope = Envelope::new(
        RATE,
        signal::rate(RATE as f64).const_hz(1.0).square(),
        signal::gen(|| 0.5),  // attack
        signal::gen(|| 0.5),  // decay
        signal::gen(|| 0.75), // sustain
        signal::gen(|| 0.5),  // release
    );

    let result = envelope.take(20).collect::<Vec<_>>();

    assert_eq!(
        result,
        vec![
            0.71417785,
            0.9233557,
            0.9846225,
            1.0,
            0.8232233,
            0.7714466,
            0.75628155,
            0.7518398,
            0.7505389,
            0.75015783,
            0.75004625,
            0.21968347,
            0.064343795,
            0.01884586,
            0.005519824,
            0.001616719,
            0.00047352596,
            0.00013869253,
            4.0622093e-5,
            1.1897937e-5
        ]
    );
}
