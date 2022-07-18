use std::ops::Add;

use fundsp::{
    hacker::{An, AudioNode, Frame, SignalFrame, Size, Tag, U1},
    math::AttoRand,
    Float, GenericSequence,
};
use numeric_array::typenum::Sum;

#[inline]
pub fn reset_trigger<X>(unit: An<X>) -> An<Trigger<X>>
where
    X: AudioNode<Sample = f32>,
    <X as AudioNode>::Inputs: Add<U1>,
    <<X as AudioNode>::Inputs as Add<U1>>::Output: Size<f32>,
{
    An(Trigger::new(unit))
}

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

    fn tick(
        &mut self,
        input: &Frame<Self::Sample, Self::Inputs>,
    ) -> Frame<Self::Sample, Self::Outputs> {
        let gate = input[0];

        if self.trigger.tick(gate, 0.0, 0.001) {
            self.x.reset(None);
        }

        self.x.tick(&Frame::generate(|i| input[i + 1])) // @todo input.offset()?
    }

    fn set(&mut self, parameter: Tag, value: f64) {
        self.x.set(parameter, value);
    }

    fn reset(&mut self, sample_rate: Option<f64>) {
        let inner_sr = sample_rate.map(|sr| sr * 2.0);
        self.x.reset(inner_sr);
        self.trigger.reset();
    }

    fn route(&self, input: &SignalFrame, frequency: f64) -> SignalFrame {
        self.x.route(input, frequency)
    }

    fn ping(&mut self, probe: bool, hash: AttoRand) -> AttoRand {
        self.x.ping(probe, hash.hash(Self::ID))
    }

    fn get(&self, parameter: Tag) -> Option<f64> {
        self.x.get(parameter)
    }
}

pub struct SchmittTrigger {
    is_open: bool,
}

impl SchmittTrigger {
    pub fn new() -> Self {
        Self { is_open: true }
    }
    pub fn tick<T: Float>(&mut self, input: T, off_threshold: f64, on_threshold: f64) -> bool {
        if self.is_open {
            // High to low
            if input <= T::from_f64(off_threshold) {
                self.is_open = false;
            }
            // Low to High
        } else if input >= T::from_f64(on_threshold) {
            self.is_open = true;
            return true;
        }
        false
    }

    pub fn is_open(&self) -> bool {
        self.is_open
    }

    pub fn reset(&mut self) {
        self.is_open = true;
    }
}

impl Default for SchmittTrigger {
    fn default() -> Self {
        Self::new()
    }
}
