use fundsp::prelude::*;
pub mod clock;
pub mod delay;
pub mod envelope;
pub mod filter;
pub mod noise;
pub mod oscillator;
pub mod parameter;
pub mod reverb;
pub mod sequencer;
pub mod vca;

use serde::{Deserialize, Serialize};
use ts_rs::TS;

use self::{
    clock::{clock, ClockParams},
    delay::{delay, DelayParams},
    envelope::{envelope, EnvelopeParams},
    filter::{filter, FilterParams},
    noise::noise,
    oscillator::{oscillator, OscillatorParams},
    parameter::{parameter, ParameterParams},
    reverb::{reverb, ReverbParams},
    sequencer::{sequencer, SequencerParams},
    vca::{vca, VcaParams},
};
use crate::{
    interface::message::SobakaMessage,
    utils::observer::{BoxedObservable, Observable, Observer, Subject},
};

#[derive(Serialize, Deserialize, TS)]
#[serde(tag = "node_type", content = "data")]
#[ts(export)]
pub enum AudioModuleType {
    Delay(DelayParams),
    Envelope(EnvelopeParams),
    // Input(InputNode),
    // Midi(MidiNode),
    // Filter(FilterNode),
    Filter(FilterParams),
    Clock(ClockParams),
    Noise,
    Parameter(ParameterParams),
    Oscillator(OscillatorParams),
    // Quantiser(QuantiserNode),
    Reverb(ReverbParams),
    // SampleAndHold(SampleAndHoldNode),
    // Sampler(SamplerNode),
    Sequencer(SequencerParams),
    // Sum(SumNode),
    Vca(VcaParams),
}

impl From<AudioModuleType> for (Box<dyn AudioUnit32 + Send>, ModuleContext) {
    fn from(node_type: AudioModuleType) -> Self {
        let mut context = ModuleContext::default();

        let node: Box<dyn AudioUnit32 + Send> = match node_type {
            AudioModuleType::Oscillator(params) => Box::new(oscillator(params, &mut context)),
            AudioModuleType::Parameter(params) => Box::new(parameter(params, &mut context)),
            AudioModuleType::Reverb(params) => Box::new(reverb(params, &mut context)),
            AudioModuleType::Filter(params) => Box::new(filter(params, &mut context)),
            AudioModuleType::Clock(params) => Box::new(clock(params, &mut context)),
            AudioModuleType::Sequencer(params) => Box::new(sequencer(params, &mut context)),
            AudioModuleType::Vca(params) => Box::new(vca(params, &mut context)),
            AudioModuleType::Envelope(params) => Box::new(envelope(params, &mut context)),
            AudioModuleType::Noise => Box::new(noise()),
            AudioModuleType::Delay(params) => Box::new(delay(params, &mut context)),
        };

        (node, context)
    }
}

/// Holds a context for audio modules
#[derive(Default)]
pub struct ModuleContext {
    /// Message transmitter. Incoming messages get sent into this transmitter.
    tx: Option<Subject<SobakaMessage>>,
    /// Message receiver. Outgoing messages get sent out via this receiver.
    rx: Option<BoxedObservable<SobakaMessage>>,
}

impl ModuleContext {
    /// Sets the message transmitter for the module
    pub fn set_tx(&mut self, tx: Subject<SobakaMessage>) {
        self.tx = Some(tx);
    }

    /// Sets the message receiver for the module
    pub fn set_rx<T: Observable<Output = SobakaMessage> + Send + 'static>(&mut self, rx: T) {
        self.rx = Some(Box::pin(rx));
    }

    pub fn get_tx(&self) -> Option<&Subject<SobakaMessage>> {
        self.tx.as_ref()
    }

    pub fn get_rx(&self) -> Option<Observer<SobakaMessage>> {
        if let Some(rx) = &self.rx {
            Some(rx.observe())
        } else {
            None
        }
    }
}
