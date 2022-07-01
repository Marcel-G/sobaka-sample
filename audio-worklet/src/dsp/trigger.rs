use fundsp::{
    hacker::{An, AudioNode, Frame, Tag, U0, U1},
    Float,
};

#[inline]
pub fn trigger<X>(unit: An<X>) -> An<Trigger<X>>
where
    X: AudioNode<Sample = f32, Inputs = U0>,
{
    An(Trigger::new(unit))
}

pub struct Trigger<X>
where
    X: AudioNode<Sample = f32, Inputs = U0>,
{
    unit: An<X>,
    is_open: bool,
}

impl<X> Trigger<X>
where
    X: AudioNode<Sample = f32, Inputs = U0>,
{
    pub fn new(unit: An<X>) -> Self {
        Self {
            unit,
            is_open: false,
        }
    }
}

impl<X> AudioNode for Trigger<X>
where
    X: AudioNode<Sample = f32, Inputs = U0>,
{
    const ID: u64 = 0;
    type Sample = X::Sample;
    type Inputs = U1;
    type Outputs = X::Outputs;

    fn tick(
        &mut self,
        input: &fundsp::hacker::Frame<Self::Sample, Self::Inputs>,
    ) -> fundsp::hacker::Frame<Self::Sample, Self::Outputs> {
        if input[0] >= 1.0 {
            if self.is_open {
                self.unit.reset(None)
            }
            self.is_open = false
        } else {
            self.is_open = true
        }

        self.unit.tick(&Frame::default())
    }

    fn set(&mut self, parameter: Tag, value: f64) {
        self.unit.set(parameter, value);
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
