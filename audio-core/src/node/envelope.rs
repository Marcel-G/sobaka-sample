use dasp::{
    graph::{BoxedNodeSend, Buffer, Input, Node},
    Sample, Signal,
};
use serde::{Deserialize, Serialize};
use strum_macros::{EnumIter, IntoStaticStr};
use ts_rs::TS;

use crate::{graph::InputId, util::input_signal::InputSignalNode};
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

#[derive(Clone, Serialize, Deserialize, TS, IntoStaticStr, EnumIter)]
#[ts(export)]

pub enum EnvelopeInput {
    Gate,
    Attack,
    Decay,
    Sustain,
    Release,
}

pub struct EnvelopeNode {
    envelope: BoxedNodeSend<InputId>,
    sample_rate: f64,
}

impl EnvelopeNode {
    pub fn new(sample_rate: f64) -> Self {
        let node = InputSignalNode::<EnvelopeInput, _>::new(|s| {
            Envelope::new(
                sample_rate as f32,
                s.input(EnvelopeInput::Gate),
                s.input(EnvelopeInput::Attack).map(|g| g.clamp(0.0, 1.0)),
                s.input(EnvelopeInput::Decay).map(|g| g.clamp(0.0, 1.0)),
                s.input(EnvelopeInput::Sustain).map(|g| g.clamp(0.0, 1.0)),
                s.input(EnvelopeInput::Release).map(|g| g.clamp(0.0, 1.0)),
            )
        });

        Self {
            envelope: BoxedNodeSend::new(node),
            sample_rate,
        }
    }
}

impl Node<InputId> for EnvelopeNode {
    fn process(&mut self, inputs: &[Input<InputId>], output: &mut [Buffer]) {
        self.envelope.process(inputs, output)
    }
}
