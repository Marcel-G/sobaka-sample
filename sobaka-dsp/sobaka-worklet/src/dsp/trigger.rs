use std::{
    marker::PhantomData,
    ops::Add,
    sync::atomic::{AtomicBool, Ordering},
};

use fundsp::{
    hacker::{An, AudioNode, Frame, SignalFrame, Size, U1},
    prelude::AttoHash,
    Float, GenericSequence,
};
use numeric_array::typenum::Sum;

#[derive(Clone)]
pub struct Trigger<X>
where
    X: AudioNode<Sample = f32>,
{
    x: An<X>,
    trigger: SchmittTrigger,
}

impl<X> Trigger<X>
where
    X: AudioNode<Sample = f32>,
{
    pub fn new(unit: An<X>) -> Self {
        Self {
            x: unit,
            trigger: SchmittTrigger::default(),
        }
    }
}

impl<X> AudioNode for Trigger<X>
where
    X: AudioNode<Sample = f32>,
    <X as AudioNode>::Inputs: Add<U1>,
    <<X as AudioNode>::Inputs as Add<U1>>::Output: Size<f32>,
{
    const ID: u64 = 0;
    type Sample = X::Sample;
    type Inputs = Sum<X::Inputs, U1>;
    type Outputs = X::Outputs;
    type Setting = X::Setting;

    fn tick(
        &mut self,
        input: &Frame<Self::Sample, Self::Inputs>,
    ) -> Frame<Self::Sample, Self::Outputs> {
        let gate = input[0];

        if self.trigger.tick(gate, 0.0, 0.001) == Some(true) {
            self.x.reset(None);
        }

        self.x.tick(&Frame::generate(|i| input[i + 1])) // @todo input.offset()?
    }

    fn set(&mut self, setting: Self::Setting) {
        self.x.set(setting)
    }

    fn reset(&mut self, sample_rate: Option<f64>) {
        let inner_sr = sample_rate.map(|sr| sr * 2.0);
        self.x.reset(inner_sr);
        self.trigger.reset();
    }

    fn route(&mut self, input: &SignalFrame, frequency: f64) -> SignalFrame {
        self.x.route(input, frequency)
    }

    fn ping(&mut self, probe: bool, hash: AttoHash) -> AttoHash {
        self.x.ping(probe, hash.hash(Self::ID))
    }
}

#[derive(Clone)]
pub struct TriggerListener<F, T: Float> {
    trigger: SchmittTrigger,
    f: F,
    _phantom: PhantomData<T>,
}

impl<F, T: Float> TriggerListener<F, T>
where
    F: Fn(bool) + Clone,
{
    pub fn new(f: F) -> Self {
        Self {
            f,
            trigger: SchmittTrigger::default(),
            _phantom: PhantomData::default(),
        }
    }
}

impl<F, T: Float> AudioNode for TriggerListener<F, T>
where
    F: Fn(bool) + Clone,
{
    const ID: u64 = 99;
    type Sample = T;
    type Inputs = U1;
    type Outputs = U1;
    type Setting = ();

    #[inline]
    fn tick(
        &mut self,
        input: &Frame<Self::Sample, Self::Inputs>,
    ) -> Frame<Self::Sample, Self::Outputs> {
        let gate = input[0];

        if let Some(is_high) = self.trigger.tick(gate, 0.0, 0.001) {
            (self.f)(is_high);
        }

        *input
    }
    fn route(&mut self, input: &SignalFrame, _frequency: f64) -> SignalFrame {
        input.clone()
    }
}

pub struct SchmittTrigger {
    is_open: AtomicBool,
}

impl Clone for SchmittTrigger {
    fn clone(&self) -> Self {
        SchmittTrigger::new()
    }
}

impl SchmittTrigger {
    pub fn new() -> Self {
        Self {
            is_open: AtomicBool::new(false),
        }
    }
    pub fn tick<T: Float>(&self, input: T, off_threshold: f64, on_threshold: f64) -> Option<bool> {
        if self.is_open.load(Ordering::SeqCst) {
            // High to low
            if input <= T::from_f64(off_threshold) {
                self.is_open.store(false, Ordering::SeqCst);
                return Some(false);
            }
            // Low to High
        } else if input >= T::from_f64(on_threshold) {
            self.is_open.store(true, Ordering::SeqCst);
            return Some(true);
        }
        None
    }

    pub fn is_open(&self) -> bool {
        self.is_open.load(Ordering::SeqCst)
    }

    pub fn reset(&mut self) {
        self.is_open.store(true, Ordering::SeqCst);
    }
}

impl Default for SchmittTrigger {
    fn default() -> Self {
        Self::new()
    }
}

#[inline]
pub fn reset_trigger<X>(unit: An<X>) -> An<Trigger<X>>
where
    X: AudioNode<Sample = f32>,
    <X as AudioNode>::Inputs: Add<U1>,
    <<X as AudioNode>::Inputs as Add<U1>>::Output: Size<f32>,
{
    An(Trigger::new(unit))
}

#[inline]
pub fn trigger_listener<F, T: Float>(f: F) -> An<TriggerListener<F, T>>
where
    F: Fn(bool) + Clone + Send + Sync,
{
    An(TriggerListener::new(f))
}
