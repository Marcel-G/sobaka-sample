use std::{
    marker::PhantomData,
    ops::{Add, Mul},
};

use fundsp::{
    hacker::{An, AudioNode, Frame, Size, U1},
    Float, GenericSequence,
};
use numeric_array::typenum::{Prod, Sum};

use crate::utils::observer::{Observable, Observer, Producer, Subject};

use super::trigger::SchmittTrigger;

#[inline]
pub fn stepped<M, N, T>(gate_passthrough: bool) -> An<Stepped<M, N, T>>
where
    M: Size<T> + Mul<N>,
    N: Size<T>,
    <M as Mul<N>>::Output: Size<T> + Add<U1>,
    <<M as Mul<N>>::Output as Add<U1>>::Output: Size<T>,
    T: Float,
{
    An(Stepped::new(gate_passthrough))
}

pub struct Stepped<M, N, T> {
    active: usize,
    trigger: SchmittTrigger,
    subject: Subject<SteppedEvent>,
    gate_passthrough: bool,
    _marker: PhantomData<(M, N, T)>,
}

impl<M, N, T> Stepped<M, N, T>
where
    M: Size<T> + Mul<N>,
    N: Size<T>,
    T: Float,
{
    pub fn new(gate_passthrough: bool) -> Self {
        Self {
            active: 0,
            subject: Subject::new(),
            trigger: SchmittTrigger::default(),
            gate_passthrough,
            _marker: PhantomData,
        }
    }
}

impl<M, N, T> Default for Stepped<M, N, T>
where
    M: Size<T> + Mul<N>,
    N: Size<T>,
    T: Float,
{
    fn default() -> Self {
        Self::new(false)
    }
}

#[derive(Clone)]
pub enum SteppedEvent {
    StepChange(usize),
}

impl<M, N, T> Observable for Stepped<M, N, T>
where
    M: Size<T> + Mul<N>,
    N: Size<T>,
    T: Float,
{
    type Output = SteppedEvent;

    fn observe(&self) -> Observer<Self::Output> {
        self.subject.observe()
    }
}

impl<M, N, T> AudioNode for Stepped<M, N, T>
where
    M: Size<T> + Mul<N>,
    N: Size<T>,
    <M as Mul<N>>::Output: Size<T> + Add<U1>,
    <<M as Mul<N>>::Output as Add<U1>>::Output: Size<T>,
    T: Float,
{
    const ID: u64 = 0;
    type Sample = T;
    type Inputs = Sum<Prod<M, N>, U1>;
    type Outputs = N;

    fn reset(&mut self, _sample_rate: Option<f64>) {
        if self.active >= M::USIZE - 1 {
            self.active = 0;
        } else {
            self.active += 1;
        }

        self.subject.notify(SteppedEvent::StepChange(self.active));
    }

    fn tick(
        &mut self,
        input: &Frame<Self::Sample, Self::Inputs>,
    ) -> Frame<Self::Sample, Self::Outputs> {
        // Channel zero is the gate
        let trigger = input[0];

        if self.trigger.tick(trigger, 0.0, 0.001) {
            if self.active >= M::USIZE - 1 {
                self.active = 0;
            } else {
                self.active += 1;
            }

            self.subject.notify(SteppedEvent::StepChange(self.active));
        }
        if self.gate_passthrough {
            // The following M are the step matrix
            Frame::generate(|i| input[i * M::USIZE + self.active + 1] * trigger)
        } else {
            Frame::generate(|i| input[i * M::USIZE + self.active + 1])
        }
    }
}
