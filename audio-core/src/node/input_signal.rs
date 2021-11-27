use crate::util::atomic_float::AtomicFloat;
use dasp::{Frame, Signal, graph::{BoxedNodeSend, Buffer, Input, Node, NodeData}};
use std::sync::Arc;

use super::AudioNode;

/// SignalNode enables the creation of dasp_graph nodes using the dasp_signal api
/// The difference between SignalNode and Box<dyn Signal> is that SignalNode enables
/// the use of graph inputs in the signal chain.
/// 
/// Inputs can be Signal<Frame=Digital> single channel digital signal is between 0 & 1.
///            or Signal<Frame=Sample> single or multi-channel audio signal.
/// # Examples
///
/// ```
/// let node = SignalNode::new(|[input]| {
///    signal::rate(44100.)
///      .hz(input.map(|f| f * 100.0))
///      .sine()
///      .map(Sample::to_sample::<f32>)
/// });
/// ```
pub struct InputSignalNode<S, const N: usize> {
    storage: [Arc<AtomicFloat>; N],
    signal: S,
}
pub struct InputSignal(Arc<AtomicFloat>);

impl<S, const N: usize> InputSignalNode<S, N>
where
    S: Signal<Frame = f32> + Send,
{
    pub fn new<F>(constructor: F) -> Self
    where
        F: (FnOnce([InputSignal; N]) -> S) + Send,
    {
        let storage: [Arc<AtomicFloat>; N] = [(); N]
          .map(|()| Arc::new(AtomicFloat::new(0.0)));

        let mut signal: [InputSignal; N] = storage.clone()
          .map(|store| InputSignal(store));

        signal.reverse();

        Self {
            storage,
            signal: (constructor)(signal),
        }
    }

    fn next(&mut self, inputs: Vec<&f32>) -> f32 {
        for (store, input) in self.storage.iter().zip(inputs) {
          store.set(*input as f64)
        };
        self.signal.next()
    }
}

impl Signal for InputSignal {
    type Frame = f64;
    fn next(&mut self) -> Self::Frame {
        self.0.get()
    }
}

impl<S, const N: usize> Node for InputSignalNode<S, N>
where
    S: Signal<Frame = f32> + Send,
{
    fn process(&mut self, inputs: &[Input], output: &mut [Buffer]) {
        let channels = output.len();

        let input_buffers = inputs[0..N]
          .iter()
          .map(|input| input.buffers())
          .collect::<Vec<_>>();

        for ix in 0..Buffer::LEN {
            // @todo multiple channels
            let input_frames = input_buffers
              .iter()
              .map(|buffer| &buffer[0][ix])
              .collect();

            let frame = self.next(input_frames);
            for ch in 0..channels {
                // Safe, as we verify the number of channels at the beginning of the function.
                output[ch][ix] = unsafe { *frame.channel_unchecked(ch) };
            }
        }
    }
}

impl<S, const N: usize> Into<NodeData<AudioNode>> for InputSignalNode<S, N>
where
    S: Signal<Frame = f32> + Send + 'static {
    fn into(self) -> NodeData<AudioNode> {
        NodeData::new1(AudioNode::Signal(BoxedNodeSend::new(self)))
    }
}