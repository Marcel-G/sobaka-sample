use std::convert::TryInto;

use derive_more::{From, TryInto};
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

use futures::StreamExt;
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
    sequencer::{sequencer, SequencerCommand, SequencerEvent, SequencerParams},
    vca::{vca, VcaParams},
};
use crate::{
    interface::message::SobakaMessage,
    utils::observer::{BoxedObservable, Observable, Observer, Producer, Subject},
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

#[derive(Serialize, Deserialize, TS, Clone)]
#[ts(export)]
pub enum BsEvent {
    // Bs module emits StepChange whenever the step is changed
    StepChange(usize),
}

#[derive(Serialize, Deserialize, TS, Clone)]
#[ts(export)]
pub enum BsCommand {
    // Bs module handles incoming UpdateStep messages
    // by setting the value of the given step.
    UpdateStep(usize, f64),
}

#[derive(Serialize, Deserialize, From, Clone)]
pub enum AudioModuleEvent {
    Sequencer(SequencerEvent),
    Bs(BsEvent),
}

#[derive(Serialize, Deserialize, TryInto, Clone)]
pub enum AudioModuleCommand {
    Sequencer(SequencerCommand),
    Bs(BsCommand),
}

pub type ModuleUnit = Box<dyn AudioUnit32 + Send>;

impl From<AudioModuleType> for (ModuleUnit, ModuleContext) {
    fn from(node_type: AudioModuleType) -> Self {
        let mut context = ModuleContext::default();

        let node: ModuleUnit = match node_type {
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

/// Holds a context for audio modules
pub struct _ModuleContext<Tx, Rx>
where
    AudioModuleCommand: TryInto<Tx>,
    Tx: Send + Clone,
    Rx: Into<AudioModuleEvent>,
{
    /// Message transmitter. Incoming messages get sent into this transmitter.
    tx: Option<Subject<Tx>>,
    /// Message receiver. Outgoing messages get sent out via this receiver.
    rx: Option<BoxedObservable<Rx>>,
}

impl<Tx, Rx> Default for _ModuleContext<Tx, Rx>
where
    AudioModuleCommand: TryInto<Tx>,
    Tx: Send + Clone,
    Rx: Into<AudioModuleEvent> + Send + Clone,
{
    fn default() -> Self {
        Self { tx: None, rx: None }
    }
}

impl<Tx, Rx> _ModuleContext<Tx, Rx>
where
    AudioModuleCommand: TryInto<Tx>,
    Tx: Send + Clone + 'static,
    Rx: Into<AudioModuleEvent> + Send + Clone + 'static,
{
    /// Sets the message transmitter for the module
    pub fn set_tx(&mut self, tx: Subject<Tx>) {
        self.tx = Some(tx);
    }

    /// Sets the message receiver for the module
    pub fn set_rx<T: Observable<Output = Rx> + Send + 'static>(&mut self, rx: T) {
        self.rx = Some(Box::pin(rx));
    }

    pub fn boxed(self) -> GlobalContext {
        Box::new(self)
    }
}

pub trait GlobalMessaging {
    /// Try send command using the module specific command type
    fn try_notify(&self, message: AudioModuleCommand) -> Result<(), ()>;

    /// Try observe module events while converting module type to api type
    fn try_observe(&self) -> Result<Observer<AudioModuleEvent>, ()>;
}

pub type GlobalContext = Box<dyn GlobalMessaging>;

impl<Tx, Rx> GlobalMessaging for _ModuleContext<Tx, Rx>
where
    AudioModuleCommand: TryInto<Tx>,
    Tx: Send + Clone + 'static,
    Rx: Into<AudioModuleEvent> + Send + Clone + 'static,
{
    /// Try send command using the module specific command type
    fn try_notify(&self, message: AudioModuleCommand) -> Result<(), ()> {
        if let Some(tx) = &self.tx {
            tx.notify(message.try_into().map_err(|_| ())?);
            Ok(())
        } else {
            Err(())
        }
    }

    /// Try observe module events while converting module type to api type
    fn try_observe(&self) -> Result<Observer<AudioModuleEvent>, ()> {
        if let Some(rx) = &self.rx {
            Ok(Box::pin(rx.observe().map(|message| message.into())))
        } else {
            Err(())
        }
    }
}


fn create_module_a(context: &mut _ModuleContext<SequencerCommand, SequencerEvent>) {}

fn create_module_b(context: &mut _ModuleContext<BsCommand, BsEvent>) {}

fn test_something(f: usize) {
    /// Example of audio module construction
    let (_, a) = match f {
        0 => {
            /// Specific context constructed for each module based on it's generic requirements
            let mut ctx = _ModuleContext::default();
            (create_module_a(&mut ctx), ctx.boxed())
        }
        _ => {
            let mut ctx = _ModuleContext::default();
            (create_module_b(&mut ctx), ctx.boxed())
        }
    };

    /// Boxed version makes any module context available via polymorphism 
    a.try_notify(AudioModuleCommand::Sequencer(SequencerCommand::UpdateStep(
        0, 0.0,
    )))
    .unwrap();
}
