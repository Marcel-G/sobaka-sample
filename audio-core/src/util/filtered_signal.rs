use dasp::{
    sample::{Duplex, FloatSample, FromSample, ToSample},
    Frame, Sample, Signal,
};

// Biquad filter from https://github.com/RustAudio/dasp/pull/148

/// Coefficients for a digital biquad filter.
/// It is assumed that the `a0` coefficient is always normalized to 1.0,
/// and thus not included.
#[derive(Copy, Clone, Debug, PartialEq)]
pub struct Coefficients<S>
where
    S: FloatSample,
{
    // Transfer function numerator coefficients.
    pub b0: S,
    pub b1: S,
    pub b2: S,

    // Transfer function denominator coefficients.
    pub a1: S,
    pub a2: S,
}

// https://arachnoid.com/BiQuadDesigner/source_files/BiQuadraticFilter.java
// Common filter constructors
impl<S> Coefficients<S>
where
    S: FloatSample,
{
    pub fn normalise(coefs: Self, a0: S) -> Self {
        Self {
            b0: coefs.b0 / a0,
            b1: coefs.b1 / a0,
            b2: coefs.b2 / a0,
            a1: coefs.a1 / a0,
            a2: coefs.a2 / a0,
        }
    }
}

/// An implementation of a digital biquad filter, using the Direct Form 2
/// Transposed (DF2T) representation.
pub struct Biquad<F, C>
where
    F: Frame,
    F::Sample: FloatSample,
    C: Iterator<Item = Coefficients<F::Sample>>,
{
    pub coeff: C,

    // Since biquad filters are second-order, we require two historical buffers.
    // This state is updated each time the filter is applied to a `Frame`.
    t0: F,
    t1: F,
}

impl<F, C> Biquad<F, C>
where
    F: Frame,
    F::Sample: FloatSample,
    C: Iterator<Item = Coefficients<F::Sample>>,
{
    pub fn new(coeff: C) -> Self {
        Self {
            coeff,
            t0: F::EQUILIBRIUM,
            t1: F::EQUILIBRIUM,
        }
    }

    /// Performs a single iteration of this filter, calculating a new filtered
    /// `Frame` from an input `Frame`.
    ///
    pub fn apply<I>(&mut self, input: I) -> I
    where
        I: Frame<NumChannels = F::NumChannels>,
        I::Sample: Duplex<F::Sample>,
    {
        let coeff = self.coeff.next().unwrap();
        // Convert into floating point representation.
        let input: F = input.map(ToSample::to_sample_);

        // Calculate scaled inputs.
        let input_by_b0 = input.scale_amp(coeff.b0);
        let input_by_b1 = input.scale_amp(coeff.b1);
        let input_by_b2 = input.scale_amp(coeff.b2);

        // This is the new filtered `Frame`.
        let output: F = self.t0.add_amp(input_by_b0);

        // Calculate scaled outputs.
        // NOTE: Negative signs on the scaling factors for these.
        let output_by_neg_a1 = output.scale_amp(-coeff.a1);
        let output_by_neg_a2 = output.scale_amp(-coeff.a2);

        // Update buffers.
        self.t0 = self.t1.add_amp(input_by_b1).add_amp(output_by_neg_a1);
        self.t1 = input_by_b2.add_amp(output_by_neg_a2);

        // Convert back into the original `Frame` format.
        output.map(FromSample::from_sample_)
    }
}

impl<F, C> From<C> for Biquad<F, C>
where
    F: Frame,
    F::Sample: FloatSample,
    C: Iterator<Item = Coefficients<F::Sample>>,
{
    // Same as `new()`, but adding this for the blanket `Into` impl.
    fn from(coeff: C) -> Self {
        Self::new(coeff)
    }
}

/// An extension to the **Signal** trait that enables iterative filtering.
///
/// ### Required Features
///
/// - When using `dasp_signal`, this item requires the **filter** feature to be enabled.
/// - When using `dasp`, this item requires the **signal-filter** feature to be enabled.
pub trait SignalFilter: Signal {
    fn filtered<C>(self, coeff: C) -> FilteredSignal<Self, C>
    where
        Self: Sized,
        <Self::Frame as Frame>::Sample:
            FromSample<<<Self::Frame as Frame>::Sample as Sample>::Float> + FloatSample,
        C: Iterator<Item = Coefficients<<Self::Frame as Frame>::Sample>>,
    {
        let biquad = Biquad::from(coeff);

        FilteredSignal {
            signal: self,
            biquad,
        }
    }
}

/// An adaptor that calculates and yields a filtered signal.
///
/// ### Required Features
///
/// - When using `dasp_signal`, this item requires the **filter** feature to be enabled.
/// - When using `dasp`, this item requires the **signal-filter** feature to be enabled.
pub struct FilteredSignal<S, C>
where
    S: Signal,
    <S::Frame as Frame>::Sample:
        FromSample<<<S::Frame as Frame>::Sample as Sample>::Float> + FloatSample,
    C: Iterator<Item = Coefficients<<S::Frame as Frame>::Sample>>,
{
    signal: S,
    biquad: Biquad<<S::Frame as Frame>::Float, C>,
}

impl<S, C> Signal for FilteredSignal<S, C>
where
    S: Signal,
    <S::Frame as Frame>::Sample:
        FromSample<<<S::Frame as Frame>::Sample as Sample>::Float> + FloatSample,
    C: Iterator<Item = Coefficients<<S::Frame as Frame>::Sample>>,
{
    // Output is the same type as the input.
    type Frame = S::Frame;

    fn next(&mut self) -> Self::Frame {
        self.biquad.apply(self.signal.next())
    }

    fn is_exhausted(&self) -> bool {
        self.signal.is_exhausted()
    }
}

// Impl this for all `Signal`s.
impl<T> SignalFilter for T where T: Signal {}
