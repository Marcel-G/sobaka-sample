use fundsp::prelude::*;

/// PhaseOscillator oscillator.
/// - Input 0: frequency in Hz.
/// - Output 0: oscillator wave.
#[derive(Default, Clone)]
pub struct PhaseOscillator<T: Real, F>
where
    F: Fn(T) -> T,
{
    generator: F,
    phase: T,
    sample_duration: T,
    hash: u64,
    initial_phase: Option<T>,
}

impl<T: Real, F> PhaseOscillator<T, F>
where
    F: Fn(T) -> T + Clone,
{
    /// Create oscillator.
    pub fn new(generator: F, sample_rate: f64) -> Self {
        let mut oscillator = PhaseOscillator {
            phase: T::zero(),
            sample_duration: T::zero(),
            hash: 0,
            generator,
            initial_phase: None,
        };
        oscillator.reset(Some(sample_rate));
        oscillator
    }
    /// Create oscillator with optional initial phase in 0...1.
    pub fn with_phase(generator: F, sample_rate: f64, initial_phase: Option<T>) -> Self {
        let mut oscillator = Self {
            phase: T::zero(),
            sample_duration: T::zero(),
            hash: 0,
            initial_phase,
            generator,
        };
        oscillator.reset(Some(sample_rate));
        oscillator
    }
}

impl<T: Real, F> AudioNode for PhaseOscillator<T, F>
where
    F: Fn(T) -> T + Clone,
{
    const ID: u64 = 21;
    type Sample = T;
    type Inputs = U1;
    type Outputs = U1;
    type Setting = ();

    fn reset(&mut self, sample_rate: Option<f64>) {
        self.phase = match self.initial_phase {
            Some(phase) => phase,
            None => T::from_f64(rnd(self.hash as i64)),
        };
        if let Some(sr) = sample_rate {
            self.sample_duration = T::from_f64(1.0 / sr);
        }
    }

    #[inline]
    fn tick(
        &mut self,
        input: &Frame<Self::Sample, Self::Inputs>,
    ) -> Frame<Self::Sample, Self::Outputs> {
        self.phase += input[0] * self.sample_duration;
        self.phase -= self.phase.floor();

        [(self.generator)(self.phase)].into()
    }

    fn process(
        &mut self,
        size: usize,
        input: &[&[Self::Sample]],
        output: &mut [&mut [Self::Sample]],
    ) {
        for i in 0..size {
            self.phase += input[0][i] * self.sample_duration;
            output[0][i] = (self.generator)(self.phase);
        }
        self.phase -= self.phase.floor();
    }

    fn set_hash(&mut self, hash: u64) {
        self.hash = hash;
        self.reset(None);
    }

    fn route(&mut self, _input: &SignalFrame, _frequency: f64) -> SignalFrame {
        let mut output = new_signal_frame(self.outputs());
        output[0] = Signal::Latency(0.0);
        output
    }
}

/// Square oscillator.
/// - Input 0: frequency (Hz)
/// - Output 0: square wave
#[inline]
pub fn sobaka_square<T: Real>() -> An<impl AudioNode<Sample = T, Inputs = U1, Outputs = U1>> {
    An(PhaseOscillator::with_phase(
        |phase| {
            if phase < T::from_f64(0.5) {
                T::from_f64(1.0)
            } else {
                T::from_f64(-1.0)
            }
        },
        DEFAULT_SR,
        None,
    ))
}

/// Triangle oscillator.
/// - Input 0: frequency (Hz)
/// - Output 0: triangle wave
#[inline]
pub fn sobaka_triangle<T: Real>() -> An<impl AudioNode<Sample = T, Inputs = U1, Outputs = U1>> {
    An(PhaseOscillator::with_phase(
        |phase| -> T {
            (phase * T::from_f64(-2.0) + T::from_f64(1.0)).abs() * T::from_f64(2.0)
                - T::from_f64(1.0)
        },
        DEFAULT_SR,
        None,
    ))
}

/// Saw-tooth oscillator.
/// - Input 0: frequency (Hz)
/// - Output 0: saw wave
#[inline]
pub fn sobaka_saw<T: Real>() -> An<impl AudioNode<Sample = T, Inputs = U1, Outputs = U1>> {
    An(PhaseOscillator::with_phase(
        |phase| -> T { phase * T::from_f64(-2.0) + T::from_f64(1.0) },
        DEFAULT_SR,
        None,
    ))
}
