use std::convert::TryInto;

use futures::StreamExt;

use crate::{
    module::{AudioModuleCommand, AudioModuleEvent, NoOp},
    utils::observer::{BoxedObservable, Observable, Observer, Producer, Subject},
};

/// Holds a context for audio modules
pub struct ModuleContext<Command = NoOp, Event = NoOp>
where
    AudioModuleCommand: TryInto<Command>,
    Command: Send + Clone,
    Event: Into<AudioModuleEvent>,
{
    /// Message transmitter. Incoming messages get sent into this transmitter.
    tx: Option<Subject<Command>>,
    /// Message receiver. Outgoing messages get sent out via this receiver.
    rx: Option<BoxedObservable<Event>>,
}

impl<Tx, Rx> Default for ModuleContext<Tx, Rx>
where
    AudioModuleCommand: TryInto<Tx>,
    Tx: Send + Clone,
    Rx: Into<AudioModuleEvent> + Send + Clone,
{
    fn default() -> Self {
        Self { tx: None, rx: None }
    }
}

impl<Tx, Rx> ModuleContext<Tx, Rx>
where
    AudioModuleCommand: TryInto<Tx>,
    Tx: Send + Clone + 'static,
    Rx: Into<AudioModuleEvent> + Send + Clone + 'static,
{
    /// Sets the command handler for the module
    pub fn set_tx(&mut self, tx: Subject<Tx>) {
        self.tx = Some(tx);
    }

    /// Sets the event emitter for the module
    pub fn set_rx<T: Observable<Output = Rx> + Send + 'static>(&mut self, rx: T) {
        self.rx = Some(Box::pin(rx));
    }

    pub fn boxed(self) -> GeneralContext {
        Box::new(self)
    }
}

pub trait GeneralMessaging {
    /// Try send command using the module specific command type
    fn try_notify(&self, message: AudioModuleCommand) -> Result<(), ()>;

    /// Try observe module events while converting module type to api type
    fn try_observe(&self) -> Result<Observer<AudioModuleEvent>, ()>;
}

pub type GeneralContext = Box<dyn GeneralMessaging + Send>;

impl<Tx, Rx> GeneralMessaging for ModuleContext<Tx, Rx>
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
