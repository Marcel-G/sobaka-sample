use super::trigger::SchmittTrigger;
use fundsp::prelude::*;
use fundsp::{hacker::AudioNode, Float};

#[derive(Default)]
pub struct Hold<T: Float> {
    sample: T,
    trigger: SchmittTrigger,
}

impl<T: Float> Hold<T> {
    pub fn new() -> Self {
        Self::default()
    }
}

impl<T: Float> AudioNode for Hold<T> {
    const ID: u64 = 0;

    type Sample = T;

    type Inputs = U2;

    type Outputs = U1;

    fn tick(
        &mut self,
        input: &fundsp::hacker::Frame<Self::Sample, Self::Inputs>,
    ) -> fundsp::hacker::Frame<Self::Sample, Self::Outputs> {
        let signal = input[0];
        let trigger = input[1];
        if self.trigger.tick(trigger, 0.0, 0.001) {
            self.sample = signal;
        }
        Frame::splat(self.sample)
    }
}

/// Hold the signal until the trigger is high.
/// - Input 0: Signal.
/// - Input 1: Trigger signal.
/// - Output 0: Held sample.
#[inline]
pub fn hold<T: Float>() -> An<Hold<T>> {
    An(Hold::new())
}
