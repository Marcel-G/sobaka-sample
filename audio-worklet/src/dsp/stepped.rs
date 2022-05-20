use fundsp::hacker::{An, AudioNode, U2, U0, U1, Frame};

// #[inline]
// pub fn stepped<X>(unit: [An<X>]) -> An<Stepped<X>>
// where
//     X: AudioNode<Sample = f64, Inputs = U0>,
// {
//     An(Stepped::new(unit))
// }

pub struct Stepped<X, const N: usize>
where
    X: AudioNode<Sample = f64, Inputs = U0>,
{
    units: [An<X>; N],
    active: usize,
}

impl<X, const N: usize> Stepped<X, N>
where
    X: AudioNode<Sample = f64, Inputs = U0>,
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
    X: AudioNode<Sample = f64, Inputs = U0>,
{
    const ID: u64 = 0;
    type Sample = X::Sample;
    type Inputs = X::Inputs;
    type Outputs = X::Outputs;

    fn reset(&mut self, _sample_rate: Option<f64>) {
        if self.active >= N {
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
}
