use std::{
    marker::PhantomData,
    ops::{Add, Mul},
};

use fundsp::{
    hacker::{An, AudioNode, Frame, Size, U2},
    Float, GenericSequence,
};
use numeric_array::typenum::{Prod, Sum, Unsigned};

use super::{
    messaging::{Callback, Emitter},
    trigger::SchmittTrigger,
};

#[inline]
pub fn stepped<M, N, T>(gate_passthrough: bool) -> An<Stepped<M, N, T>>
where
    M: Size<T> + Mul<N>,
    N: Size<T>,
    <M as Mul<N>>::Output: Size<T> + Add<U2>,
    <<M as Mul<N>>::Output as Add<U2>>::Output: Size<T>,
    T: Float,
{
    An(Stepped::new(gate_passthrough))
}

pub struct Stepped<M, N, T> {
    active: usize,
    trigger: SchmittTrigger,
    reset_trigger: SchmittTrigger,
    on_event: Option<Callback<SteppedEvent>>,
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
            on_event: None,
            trigger: SchmittTrigger::default(),
            reset_trigger: SchmittTrigger::default(),
            gate_passthrough,
            _marker: PhantomData,
        }
    }

    fn notify(&self, event: SteppedEvent) {
        if let Some(callback) = &self.on_event {
            (callback)(event)
        }
    }
}

impl<M, N, T> Emitter for Stepped<M, N, T>
where
    M: Size<T> + Mul<N>,
    N: Size<T>,
    T: Float,
{
    type Event = SteppedEvent;

    fn add_event_listener_with_callback(&mut self, callback: Callback<Self::Event>) {
        self.on_event = Some(callback)
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

impl<M, N, T> AudioNode for Stepped<M, N, T>
where
    M: Size<T> + Mul<N>,
    N: Size<T>,
    <M as Mul<N>>::Output: Size<T> + Add<U2>,
    <<M as Mul<N>>::Output as Add<U2>>::Output: Size<T>,
    T: Float,
{
    const ID: u64 = 0;
    type Sample = T;
    type Inputs = Sum<Prod<M, N>, U2>;
    type Outputs = N;

    fn reset(&mut self, _sample_rate: Option<f64>) {
        if self.active >= M::USIZE - 1 {
            self.active = 0;
        } else {
            self.active += 1;
        }

        self.notify(SteppedEvent::StepChange(self.active));
    }

    fn tick(
        &mut self,
        input: &Frame<Self::Sample, Self::Inputs>,
    ) -> Frame<Self::Sample, Self::Outputs> {
        // Channel zero is the gate
        let trigger = input[0];
        let reset = input[1];

        if self.reset_trigger.tick(reset, 0.0, 0.001) == Some(true) {
            self.active = 0;

            // @todo these messages could be fired at near audio rate. Probably need to throttle this somewhere.
            self.notify(SteppedEvent::StepChange(self.active));
        }

        if self.trigger.tick(trigger, 0.0, 0.001) == Some(true) {
            if self.active >= M::USIZE - 1 {
                self.active = 0;
            } else {
                self.active += 1;
            }

            self.notify(SteppedEvent::StepChange(self.active));
        }
        if self.gate_passthrough {
            // The following M are the step matrix
            Frame::generate(|i| input[i * M::USIZE + self.active + U2::USIZE] * trigger)
        } else {
            Frame::generate(|i| input[i * M::USIZE + self.active + U2::USIZE])
        }
    }
}
