use crate::{
    graph::InputId,
    util::{
        atomic_float::AtomicFloat,
        input::{filter_inputs, summed},
    },
};
use dasp::{
    graph::{Buffer, Input, Node},
    Frame, Signal,
};
use std::{marker::PhantomData, ops::Index, sync::Arc};
use strum::IntoEnumIterator;

/// SignalNode enables the creation of dasp_graph nodes using the dasp_signal api
/// The difference between SignalNode and Box<dyn Signal> is that SignalNode enables
/// the use of graph inputs in the signal chain.
///
/// Inputs can be Signal<Frame=Digital> single channel digital signal is between 0 & 1.
///            or Signal<Frame=Sample> single or multi-channel audio signal.
pub struct InputSignalNode<I, S> {
    storage: SignalStorage<I>,
    signal: S,
}

impl<I, S> InputSignalNode<I, S>
where
    S: Signal<Frame = f32> + Send,
    I: IntoEnumIterator + Into<&'static str>,
{
    pub fn new<F>(constructor: F) -> Self
    where
        F: (FnOnce(SignalStorage<I>) -> S) + Send,
    {
        let storage = SignalStorage::new();
        let consumer = storage.clone();
        Self {
            storage,
            signal: (constructor)(consumer),
        }
    }

    fn next(&mut self, inputs: &[f32]) -> f32 {
        for (input, store) in inputs.iter().zip(self.storage.0.iter()) {
            store.set(*input as f64)
        }
        self.signal.next()
    }
}

impl<I, S> Node<InputId> for InputSignalNode<I, S>
where
    S: Signal<Frame = f32> + Send,
    I: IntoEnumIterator + Into<&'static str>,
{
    fn process(&mut self, inputs: &[Input<InputId>], output: &mut [Buffer]) {
        let channels = output.len();

        let input_buffers = I::iter()
            .map(|name| summed(&filter_inputs(inputs, name)))
            .collect::<Vec<_>>();

        // Silence output until all inputs are connected
        if input_buffers.len() != self.storage.0.len() {
            for out_buffer in output.iter_mut() {
                out_buffer.silence();
            }
        } else {
            for ix in 0..Buffer::LEN {
                // @todo multiple channels
                let input_frames = input_buffers
                    .iter()
                    .map(|buffer| buffer[ix])
                    .collect::<Vec<_>>();

                let frame = self.next(&input_frames);
                for (ch, buffer) in output.iter_mut().enumerate().take(channels) {
                    // Safe, as we verify the number of channels at the beginning of the function.
                    buffer[ix] = unsafe { *frame.channel_unchecked(ch) };
                }
            }
        }
    }
}

/// InputSignal

#[derive(Default)]
pub struct InputSignal(Arc<AtomicFloat>);

impl Signal for InputSignal {
    type Frame = f64;
    fn next(&mut self) -> Self::Frame {
        self.0.get()
    }
}

/// SignalStorage
pub struct SignalStorage<I>(Arc<Vec<Arc<AtomicFloat>>>, PhantomData<I>);

impl<I> SignalStorage<I>
where
    I: IntoEnumIterator + Into<&'static str>,
{
    pub fn new() -> Self {
        let slice = I::iter().map(|_| Arc::default()).collect::<Vec<_>>();

        Self(Arc::new(slice), PhantomData)
    }
    pub fn input<S: Into<&'static str>>(&self, name: S) -> InputSignal {
        let name_str = name.into();
        let i = I::iter().position(|s| s.into() == name_str);

        let inner = self.0.index(i.unwrap());
        InputSignal(inner.clone())
    }
}

impl<I> Clone for SignalStorage<I>
where
    I: IntoEnumIterator + Into<&'static str>,
{
    fn clone(&self) -> Self {
        Self(self.0.clone(), PhantomData)
    }
}
