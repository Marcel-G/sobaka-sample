use std::marker::PhantomData;

use fundsp::{
    hacker::{An, AudioNode, Frame, Size, U1},
    Float,
};

use crate::utils::observer::{Observable, Observer, Producer, Subject};

#[inline]
pub fn stepped<N: Size<T>, T: Float>() -> An<Stepped<N, T>> {
    An(Stepped::new())
}

pub struct Stepped<N, T> {
    active: usize,
    subject: Subject<Event>,
    _marker: PhantomData<(N, T)>,
}

impl<N: Size<T>, T: Float> Stepped<N, T> {
    pub fn new() -> Self {
        Self {
            active: 0,
            subject: Subject::new(),
            _marker: PhantomData,
        }
    }
}

#[derive(Clone)]
pub enum Event {
    StepChange(usize),
}

impl<N, T> Observable for Stepped<N, T> {
    type Output = Event;

    fn observe(&self) -> Observer<Self::Output> {
        self.subject.observe()
    }
}

impl<N: Size<T>, T: Float> AudioNode for Stepped<N, T> {
    const ID: u64 = 0;
    type Sample = T;
    type Inputs = N;
    type Outputs = U1;

    fn reset(&mut self, _sample_rate: Option<f64>) {
        if self.active >= self.inputs() - 1 {
            self.active = 0;
        } else {
            self.active += 1;
        }

        self.subject.notify(Event::StepChange(self.active));
    }

    fn tick(
        &mut self,
        input: &Frame<Self::Sample, Self::Inputs>,
    ) -> Frame<Self::Sample, Self::Outputs> {
        Frame::splat(input[self.active])
    }
}
