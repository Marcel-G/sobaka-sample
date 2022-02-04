use crate::util::{
    atomic_float::AtomicFloat,
    input::{filter_inputs, summed},
};
use dasp::{
    graph::{Buffer, Input, Node},
    Frame, Signal,
};
use enum_map::{EnumArray, EnumMap};
use std::{ops::Index, sync::Arc};

/// SignalNode enables the creation of dasp_graph nodes using the dasp_signal api
/// The difference between SignalNode and Box<dyn Signal> is that SignalNode enables
/// the use of graph inputs in the signal chain.
///
/// Inputs can be Signal<Frame=Digital> single channel digital signal is between 0 & 1.
///            or Signal<Frame=Sample> single or multi-channel audio signal.
/// # Examples
///
/// ```
/// enum SignalInput {
///   Frequency
/// }
/// let node = SignalNode::new(|storage| {
///    signal::rate(44100.)
///      .hz(storage.input(SignalInput::Frequency).map(|f| f * 100.0))
///      .sine()
///      .map(Sample::to_sample::<f32>)
/// });
/// ```
pub struct InputSignalNode<S, I>
where
    I: EnumArray<Arc<AtomicFloat>>,
{
    storage: SignalStorage<I>,
    signal: S,
}

impl<S, I> InputSignalNode<S, I>
where
    S: Signal<Frame = f32> + Send,
    I: EnumArray<Arc<AtomicFloat>>,
{
    pub fn new<F>(constructor: F) -> Self
    where
        F: (FnOnce(SignalStorage<I>) -> S) + Send,
    {
        let storage = SignalStorage::default();
        let consumer = storage.clone();
        Self {
            storage,
            signal: (constructor)(consumer),
        }
    }

    fn next(&mut self, inputs: Vec<(I, &f32)>) -> f32 {
        for (input, value) in inputs {
            let store = self.storage.input(input);
            store.0.set(*value as f64)
        }
        self.signal.next()
    }
}

impl<S, I> Node for InputSignalNode<S, I>
where
    S: Signal<Frame = f32> + Send,
    I: EnumArray<Arc<AtomicFloat>> + Clone + PartialEq,
{
    type InputType = I;
    fn process(&mut self, inputs: &[Input<Self::InputType>], output: &mut [Buffer]) {
        let channels = output.len();

        let input_buffers = self
            .storage
            .0
            .iter()
            .filter_map(|(name, _)| {
                let named_inputs = filter_inputs(inputs, &name);
                if !named_inputs.is_empty() {
                    Some((name.clone(), summed(&named_inputs)))
                } else {
                    None
                }
            })
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
                    .map(|(i, buffer)| (i.clone(), &buffer[ix]))
                    .collect();

                let frame = self.next(input_frames);
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
pub struct SignalStorage<I: EnumArray<Arc<AtomicFloat>>>(Arc<EnumMap<I, Arc<AtomicFloat>>>);

impl<I> SignalStorage<I>
where
    I: EnumArray<Arc<AtomicFloat>>,
{
    pub fn input(&self, name: I) -> InputSignal {
        let inner = self.0.index(name);
        InputSignal(inner.clone())
    }
}

impl<I> Default for SignalStorage<I>
where
    I: EnumArray<Arc<AtomicFloat>>,
{
    fn default() -> Self {
        Self(Default::default())
    }
}

impl<I> Clone for SignalStorage<I>
where
    I: EnumArray<Arc<AtomicFloat>>,
{
    fn clone(&self) -> Self {
        Self(self.0.clone())
    }
}
