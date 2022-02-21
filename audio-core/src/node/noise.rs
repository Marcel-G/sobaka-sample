use dasp::{
    graph::{Buffer, Input, Node},
    signal, Signal,
};

use crate::graph::InputId;
pub struct NoiseNode {
    sig: Box<dyn Signal<Frame = f64> + Send>,
}

impl Default for NoiseNode {
    fn default() -> Self {
        Self {
            sig: Box::new(signal::noise(0)),
        }
    }
}

impl Node<InputId> for NoiseNode {
    fn process(&mut self, _inputs: &[Input<InputId>], output: &mut [Buffer]) {
        output[0]
            .iter_mut()
            .for_each(|s| *s = self.sig.next() as f32);
    }
}
