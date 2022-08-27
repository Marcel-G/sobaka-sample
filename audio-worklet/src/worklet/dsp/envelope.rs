//! Subsampled control node.

use std::marker::PhantomData;

use fundsp::prelude::*;

/// Sample a time varying function.
/// The return type can be scalar or tuple.
/// It determines the number of output channels.
#[derive(Default)]
pub struct Envelope<N, T, F, E, R>
where
    N: Size<T>,
    T: Float,
    F: Float,
    E: Fn(F, Frame<T, N>) -> R,
    R: ConstantFrame<Sample = F>,
    R::Size: Size<F>,
    R::Size: Size<T>,
{
    /// Control function.
    envelope: E,
    /// Time at next sample.
    t: F,
    /// Start of current segment.
    t_0: F,
    /// End of current segment.
    t_1: F,
    /// Current time dependent hash.
    t_hash: u64,
    /// Value at start of current segment.
    value_0: Frame<T, R::Size>,
    /// Value at end of current segment.
    value_1: Frame<T, R::Size>,
    /// Value at next sample.
    value: Frame<T, R::Size>,
    /// Value delta per sample.
    value_d: Frame<T, R::Size>,
    /// Average interval between segments in seconds.
    interval: F,
    /// Sample duration in seconds.
    sample_duration: F,
    /// Deterministic pseudorandom phase.
    hash: u64,

    _phantom: PhantomData<N>,
}

impl<N, T, F, E, R> Envelope<N, T, F, E, R>
where
    N: Size<T>,
    T: Float,
    F: Float,
    E: Fn(F, Frame<T, N>) -> R,
    R: ConstantFrame<Sample = F>,
    R::Size: Size<F>,
    R::Size: Size<T>,
{
    pub fn new(interval: F, sample_rate: f64, envelope: E) -> Self {
        assert!(interval > F::zero());
        let mut node = Envelope::<N, T, F, E, R> {
            envelope,
            t: F::zero(),
            t_0: F::zero(),
            t_1: F::zero(),
            t_hash: 0,
            value_0: Frame::default(),
            value_1: Frame::default(),
            value: Frame::default(),
            value_d: Frame::default(),
            interval,
            sample_duration: F::zero(),
            hash: 0,
            _phantom: PhantomData,
        };
        node.reset(Some(sample_rate));
        node
    }

    fn next_segment(&mut self, input: Frame<T, N>) {
        self.t_0 = self.t_1;
        self.value_0 = self.value_1.clone();
        // Jitter the next sample point.
        let next_interval = lerp(
            F::from_f32(0.75),
            F::from_f32(1.25),
            convert(rnd(self.t_hash as i64)),
        ) * self.interval;
        self.t_1 = self.t_0 + next_interval;
        let value_1: Frame<_, _> = (self.envelope)(self.t_1, input).convert();
        self.value_1 = Frame::generate(|i| convert(value_1[i]));
        self.t_hash = self
            .t_hash
            .wrapping_mul(6364136223846793005)
            .wrapping_add(1);
        let u = delerp(self.t_0, self.t_1, self.t);
        self.value = Frame::generate(|i| lerp(self.value_0[i], self.value_1[i], convert(u)));
        let samples = next_interval / self.sample_duration;
        self.value_d = Frame::generate(|i| (self.value_1[i] - self.value_0[i]) / convert(samples));
    }
}

impl<N, T, F, E, R> AudioNode for Envelope<N, T, F, E, R>
where
    N: Size<T>,
    T: Float,
    F: Float,
    E: Fn(F, Frame<T, N>) -> R,
    R: ConstantFrame<Sample = F>,
    R::Size: Size<F>,
    R::Size: Size<T>,
{
    const ID: u64 = 14;
    type Sample = T;
    type Inputs = N;
    type Outputs = R::Size;

    fn reset(&mut self, sample_rate: Option<f64>) {
        self.t = F::zero();
        self.t_0 = F::zero();
        self.t_1 = F::zero();
        self.t_hash = self.hash;
        if let Some(sr) = sample_rate {
            self.sample_duration = convert(1.0 / sr)
        };
    }

    #[inline]
    fn tick(
        &mut self,
        input: &Frame<Self::Sample, Self::Inputs>,
    ) -> Frame<Self::Sample, Self::Outputs> {
        if self.t >= self.t_1 {
            self.next_segment(input.clone());
        }
        let output = self.value.clone();
        self.value += &self.value_d;
        self.t += self.sample_duration;
        output
    }

    fn process(
        &mut self,
        size: usize,
        input: &[&[Self::Sample]],
        output: &mut [&mut [Self::Sample]],
    ) {
        if self.t >= self.t_1 {
            self.next_segment(Frame::generate(|i| convert(input[i][0])));
        }
        let mut i = 0;
        while i < size {
            let segment_samples_left =
                ceil((self.t_1 - self.t) / self.sample_duration).to_i64() as usize;
            let loop_samples = min(size - i, segment_samples_left);
            for channel in 0..self.outputs() {
                let mut value = self.value[channel];
                let delta = self.value_d[channel];
                for j in i..i + loop_samples {
                    output[channel][j] = value;
                    value += delta;
                }
                self.value[channel] = value;
            }
            i += loop_samples;
            self.t += F::new(loop_samples as i64) * self.sample_duration;
            if loop_samples == segment_samples_left && i < size {
                self.next_segment(Frame::generate(|j| convert(input[j][i])));
            }
        }
    }

    fn set_hash(&mut self, hash: u64) {
        self.hash = hash;
        self.t_hash = hash;
    }
}

/// Control envelope from time-varying, input dependent function `f(t, inputs)` with `t` in seconds.
/// Spaces samples using pseudorandom jittering.
/// - Input N: number of inputs
/// - Output(s): envelope linearly interpolated from samples at 2 ms intervals (average).
#[inline]
pub fn dsp_envelope<N, T, F, E, R>(f: E) -> An<Envelope<N, T, F, E, R>>
where
    N: Size<T>,
    T: Float,
    F: Float,
    E: Fn(F, Frame<T, N>) -> R,
    R: ConstantFrame<Sample = F>,
    R::Size: Size<F>,
    R::Size: Size<T>,
{
    // Signals containing frequencies no greater than about 20 Hz would be considered control rate.
    // Therefore, sampling at 500 Hz means these signals are fairly well represented.
    // While we represent time in double precision internally, it is often okay to use single precision
    // in envelopes, as local component time typically does not get far from origin.
    An(Envelope::new(F::from_f64(0.002), DEFAULT_SR, f))
}
