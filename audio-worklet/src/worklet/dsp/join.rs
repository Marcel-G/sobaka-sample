use std::marker::PhantomData;

use fundsp::prelude::*;

/// Join `N` channels into one by averaging. Inverse of `Split<N, T>`.
pub struct Join<N, T> {
    _marker: PhantomData<(N, T)>,
}

impl<N, T> Join<N, T>
where
    N: Size<T>,
    T: Float,
{
    #[allow(clippy::new_without_default)]
    pub fn new() -> Self {
        Self {
            _marker: PhantomData::default(),
        }
    }
}

impl<N, T> AudioNode for Join<N, T>
where
    N: Size<T>,
    T: Float,
{
    const ID: u64 = 41;
    type Sample = T;
    type Inputs = N;
    type Outputs = U1;

    #[inline]
    fn tick(
        &mut self,
        input: &Frame<Self::Sample, Self::Inputs>,
    ) -> Frame<Self::Sample, Self::Outputs> {
        let mut output = input[0];
        for i in 0..N::USIZE {
            output += input[i];
        }
        [output / T::new(N::I64)].into()
    }
    fn process(
        &mut self,
        size: usize,
        input: &[&[Self::Sample]],
        output: &mut [&mut [Self::Sample]],
    ) {
        let z = T::one() / T::new(N::I64);
        for i in 0..size {
            output[0][i] = input[0][i] * z;
        }
        // @todo this channel indexing part is broken in fundsp
        for channel in 0..N::USIZE {
            for i in 0..size {
                output[0][i] += input[channel][i] * z;
            }
        }
    }
    fn route(&self, input: &SignalFrame, _frequency: f64) -> SignalFrame {
        Routing::Join.propagate(input, self.outputs())
    }
}

/// Average N channels into one. Inverse of `split`.
#[inline]
pub fn dsp_join<N, T>() -> An<Join<N, T>>
where
    T: Float,
    N: Size<T>,
{
    An(Join::new())
}
