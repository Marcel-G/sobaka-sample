use fundsp::hacker::{An, AudioNode, U0, Tag};

#[inline]
pub fn stepped<X, const N: usize>(unit: [An<X>; N]) -> An<Stepped<X, N>>
where
    X: AudioNode<Sample = f32, Inputs = U0>,
{
    An(Stepped::new(unit))
}

pub struct Stepped<X, const N: usize>
where
    X: AudioNode<Sample = f32, Inputs = U0>,
{
    units: [An<X>; N],
    active: usize,
}

impl<X, const N: usize> Stepped<X, N>
where
    X: AudioNode<Sample = f32, Inputs = U0>,
{
    pub fn new(units: [An<X>; N]) -> Self {
        Self {
            units,
            active: 0,
        }
    }
}

impl<X, const N: usize> AudioNode for Stepped<X, N>
where
    X: AudioNode<Sample = f32, Inputs = U0>,
{
    const ID: u64 = 0;
    type Sample = X::Sample;
    type Inputs = X::Inputs;
    type Outputs = X::Outputs;

    fn reset(&mut self, _sample_rate: Option<f64>) {
        if self.active >= N - 1 {
            self.active = 0;
        } else {
            self.active += 1;
        }
    }

    fn tick(
        &mut self,
        input: &fundsp::hacker::Frame<Self::Sample, Self::Inputs>,
    ) -> fundsp::hacker::Frame<Self::Sample, Self::Outputs> {
        self.units[self.active].tick(input)
    }

    fn set(&mut self, parameter: Tag, value: f64) {
        for unit in self.units.iter_mut() {
            unit.set(parameter, value);
        }
    }
}
