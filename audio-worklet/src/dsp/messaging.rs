use std::sync::{Mutex, Arc};

use futures::{
  StreamExt,
  channel::mpsc::{self, UnboundedSender, UnboundedReceiver},
};


use async_std::task::spawn_local;
use fundsp::hacker32::*;

use crate::interface::message::SobakaMessage;

// Handler for incoming messages
pub fn handler<U, F>(unit: An<U>, message_fn: F) -> (UnboundedSender<SobakaMessage>, An<Handler<U>>)
where
    U: AudioNode<Sample = f32> + 'static,
    F: Fn(&mut U, SobakaMessage) + 'static,
{
    let (tx, node) = Handler::new(unit, message_fn);
    (tx, An(node))
}

pub struct Handler<U>
where
    U: AudioNode<Sample = f32>,
{
    unit: Arc<Mutex<An<U>>>,
}

impl<U> Handler<U>
where
    U: AudioNode<Sample = f32> + 'static,
{
    pub fn new<F>(unit: An<U>, message_fn: F) -> (UnboundedSender<SobakaMessage>, Self)
    where
        F: Fn(&mut U, SobakaMessage) + 'static,
    {
        let (tx, mut rx) = mpsc::unbounded();

        let shared_unit = Arc::new(Mutex::new(unit));
        let handler = Handler {
            unit: shared_unit.clone(),
        };

        spawn_local(async move {
          while let Some(message) = rx.next().await {
            let mut unit = shared_unit.lock().unwrap();
            message_fn(&mut unit, message);
          }
        });

        (tx, handler)
    }
}

impl<U> AudioNode for Handler<U>
where
    U: AudioNode<Sample = f32>,
    U::Inputs: Size<f32>,
    U::Outputs: Size<f32>,
{
    const ID: u64 = U::ID;

    type Sample = U::Sample;

    type Inputs = U::Inputs;

    type Outputs = U::Outputs;

    fn reset(&mut self, sample_rate: Option<f64>) {
        self.unit.lock().unwrap().0.reset(sample_rate)
    }

    fn tick(
        &mut self,
        input: &Frame<Self::Sample, Self::Inputs>,
    ) -> Frame<Self::Sample, Self::Outputs> {
        self.unit.lock().unwrap().0.tick(input)
    }

    fn process(
        &mut self,
        size: usize,
        input: &[&[Self::Sample]],
        output: &mut [&mut [Self::Sample]],
    ) {
        self.unit.lock().unwrap().0.process(size, input, output)
    }

    fn set(&mut self, parameter: Tag, value: f64) {
        self.unit.lock().unwrap().0.set(parameter, value)
    }

    fn get(&self, parameter: Tag) -> Option<f64> {
        self.unit.lock().unwrap().0.get(parameter)
    }
}

// Handler for incoming messages
pub fn emitter<F>(message_fn: F) -> (UnboundedReceiver<SobakaMessage>, An<Emitter<F>>)
where
    F: FnMut(&f32) -> Option<SobakaMessage>,
{
    let (tx, node) = Emitter::new(message_fn);
    (tx, An(node))
}

pub struct Emitter<F>
where
    F: FnMut(&f32) -> Option<SobakaMessage>,
{
    tx: UnboundedSender<SobakaMessage>,
    message_fn: F,
}

// implement Emitter with new function that constructs a new emitter
impl<F> Emitter<F>
where
    F: FnMut(&f32) -> Option<SobakaMessage>,
{
    pub fn new(message_fn: F) -> (UnboundedReceiver<SobakaMessage>, Self) {
        let (tx, rx) = mpsc::unbounded();
        let emitter = Emitter {
            tx,
            message_fn,
        };

        (rx, emitter)
    }

    fn send_message(&self, message: SobakaMessage) {
        self.tx.unbounded_send(message).unwrap();
    }
}

impl<F> AudioNode for Emitter<F>
where
    F: FnMut(&f32) -> Option<SobakaMessage>,
{
    const ID: u64 = 77;

    type Sample = f32;

    type Inputs = U1;

    type Outputs = U0;

    fn tick(
        &mut self,
        input: &Frame<Self::Sample, Self::Inputs>,
    ) -> Frame<Self::Sample, Self::Outputs> {
        let value = input[0];
        if let Some(message) = (self.message_fn)(&value) {
            self.send_message(message);
        }
        Default::default()
    }

}