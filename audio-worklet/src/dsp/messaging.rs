use std::sync::{Mutex, Arc};

use futures::{
  StreamExt,
  channel::mpsc::{self, UnboundedSender},
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

// pub struct Emitter<U, F>
// where
//     U: AudioNode<Sample = f32>,
//     F: Fn(&mut U, SobakaMessage),
// {
//     rx: Receiver<SobakaMessage>,
//     unit: An<U>,
//     message_fn: F,
// }
