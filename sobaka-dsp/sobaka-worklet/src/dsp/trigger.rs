use std::{
    ops::Add,
    sync::atomic::{AtomicBool, Ordering},
};

use fundsp::{
    hacker::{An, AudioNode, Frame, SignalFrame, Size, Tag, U1},
    math::AttoRand,
    Float, GenericSequence,
};
use numeric_array::typenum::Sum;

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

        if self.trigger.tick(gate, 0.0, 0.001) == Some(true) {
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

// @todo -- indclude high / low threshold in the struct
// pub struct SchmittTrigger {
//     pub threshold_low: f32,
//     pub threshold_high: f32,
//     pub is_high: bool,
// }

// impl SchmittTrigger {
//     pub fn new(threshold_low: f32, threshold_high: f32) -> SchmittTrigger {
//         SchmittTrigger {
//             threshold_low,
//             threshold_high,
//             is_high: false,
//         }
//     }

//     pub fn update(&mut self, input: f32) -> bool {
//         if self.is_high {
//             if input <= self.threshold_low {
//                 self.is_high = false;
//             }
//         } else {
//             if input >= self.threshold_high {
//                 self.is_high = true;
//             }
//         }
//         self.is_high
//     }
// }

pub struct SchmittTrigger {
    is_open: AtomicBool,
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
