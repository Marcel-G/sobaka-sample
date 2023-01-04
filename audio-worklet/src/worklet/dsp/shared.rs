use std::sync::{Arc, Mutex, MutexGuard};

use fundsp::{hacker::Complex64, hacker32::*};

/// AudioNodes in `fundsp` are owned by audio processing. In some cases,
/// it is necessary to be able to mutate the state of `AudioNodes` asyncronously.
/// By wrapping an `AudioNode` with `Shared` it can be cloned, which clones
/// the reference to the `AudioNode` and allows interior mutability of the `AudioNode`.
pub struct Shared<X: AudioNode>(Arc<Mutex<X>>);

pub trait Share<X: AudioNode> {
    /// Converts a `AudioNode` into a `Shared` `AudioNode`.
    /// Call `.clone()` on it to clone a reference with interior mutability to this node.
    fn share(self) -> An<Shared<X>>;
}

impl<X: AudioNode> Clone for Shared<X> {
    fn clone(&self) -> Self {
        Shared(self.0.clone())
    }
}
impl<X: AudioNode> Shared<X> {
    pub fn lock(&self) -> MutexGuard<X> {
        self.0.lock().unwrap()
    }
}

impl<X: AudioNode> AudioNode for Shared<X> {
    type Sample = X::Sample;

    const ID: u64 = 0;

    type Inputs = X::Inputs;

    type Outputs = X::Outputs;

    fn reset(&mut self, sample_rate: Option<f64>) {
        self.0.lock().unwrap().reset(sample_rate);
    }

    fn tick(
        &mut self,
        input: &Frame<Self::Sample, Self::Inputs>,
    ) -> Frame<Self::Sample, Self::Outputs> {
        self.0.lock().unwrap().tick(input)
    }

    fn process(
        &mut self,
        size: usize,
        input: &[&[Self::Sample]],
        output: &mut [&mut [Self::Sample]],
    ) {
        self.0.lock().unwrap().process(size, input, output)
    }

    fn set_hash(&mut self, hash: u64) {
        self.0.lock().unwrap().set_hash(hash)
    }

    fn ping(&mut self, probe: bool, hash: AttoRand) -> AttoRand {
        self.0.lock().unwrap().ping(probe, hash)
    }

    fn route(&self, input: &SignalFrame, frequency: f64) -> SignalFrame {
        self.0.lock().unwrap().route(input, frequency)
    }

    fn set(&mut self, parameter: Tag, value: f64) {
        self.0.lock().unwrap().set(parameter, value);
    }

    fn get(&self, parameter: Tag) -> Option<f64> {
        self.0.lock().unwrap().get(parameter)
    }

    fn response(&self, output: usize, frequency: f64) -> Option<Complex64> {
        self.0.lock().unwrap().response(output, frequency)
    }

    fn response_db(&self, output: usize, frequency: f64) -> Option<f64> {
        self.0.lock().unwrap().response_db(output, frequency)
    }

    fn latency(&self) -> Option<f64> {
        self.0.lock().unwrap().latency()
    }
}

impl<X> Share<X> for An<X>
where
    X: AudioNode,
{
    fn share(self) -> An<Shared<X>> {
        An(Shared(Arc::new(Mutex::new(self.0))))
    }
}

unsafe impl<X: AudioNode> Send for Shared<X> {}
unsafe impl<X: AudioNode> Sync for Shared<X> {}
