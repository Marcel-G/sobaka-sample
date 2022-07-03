use fundsp::prelude::*;
use std::cmp;

/// Karplus-Strong oscillator.
/// Modified version of fundsp string https://github.com/SamiPerttu/fundsp/blob/b7f84823cb130c57c9969fbf7b875f453d008ff5/src/oscillator.rs#L191
/// - Input 0: string excitation.
/// - Input 1: frequency.
/// - Output 0: plucked string.
pub struct Pluck<T: Float> {
    damping: Fir<T, U3>,
    tuning: Allpole<T, T, U1>,
    line: Vec<T>,
    gain: T,
    pos: usize,
    hash: u64,
    frequency: T,
    gain_per_second: T,
    sample_rate: f64,
    loop_delay_length: usize,
    initialized: bool,
}

const MIN_FREQUENCY: f64 = 20.0;

impl<T: Float> Pluck<T> {
    // Create new Karplus-Strong oscillator. High frequency damping is in 0...1.
    pub fn new(
        sample_rate: f64,
        frequency: T,
        gain_per_second: T,
        high_frequency_damping: T,
    ) -> Self {
        Self {
            damping: fir3(T::one() - high_frequency_damping),
            tuning: Allpole::new(sample_rate, T::one()),
            line: Vec::new(),
            gain: T::from_f64(pow(gain_per_second.to_f64(), 1.0 / frequency.to_f64())),
            pos: 0,
            hash: 0,
            frequency,
            loop_delay_length: 0,
            sample_rate,
            initialized: false,
            gain_per_second,
        }
    }

    fn initialize_line(&mut self) {
        // Allpass filter delay is in epsilon ... epsilon + 1.
        let epsilon = 0.2;
        // Damping filter delay is 1 sample.
        let total_delay = self.sample_rate / self.frequency.to_f64() - 1.0;
        let loop_delay = floor(total_delay - epsilon);
        let allpass_delay = total_delay - loop_delay;

        let max_delay = self.sample_rate / MIN_FREQUENCY - 1.0;
        let max_loop_delay = floor(max_delay - epsilon) as usize;

        self.loop_delay_length = cmp::min(loop_delay as usize, max_loop_delay);

        self.tuning = Allpole::new(self.sample_rate, T::from_f64(allpass_delay));
        self.line.resize(max_loop_delay, T::zero());
        let mut rnd = AttoRand::new(self.hash);
        for i in 0..self.line.len() {
            self.line[i] = rnd.get11();
        }
        self.pos = 0;
        self.initialized = true;
    }

    pub fn set_gain(&mut self, gain_per_second: T) {
        self.gain_per_second = gain_per_second;
        self.gain = T::from_f64(pow(
            self.gain_per_second.to_f64(),
            1.0 / self.frequency.to_f64(),
        ));
    }

    pub fn set_damping(&mut self, high_frequency_damping: T) {
        self.damping = fir3(T::one() - high_frequency_damping);
    }

    fn set_frequency(&mut self, frequency: T) {
        self.frequency = max(T::from_f64(20.0), frequency);
        self.gain = T::from_f64(pow(
            self.gain_per_second.to_f64(),
            1.0 / self.frequency.to_f64(),
        ));

        if self.initialized {
            let epsilon = 0.2;
            // Damping filter delay is 1 sample.
            let total_delay = self.sample_rate / self.frequency.to_f64() - 1.0;
            let loop_delay = floor(total_delay - epsilon);
            let allpass_delay = total_delay - loop_delay;
            self.tuning.set_delay(T::from_f64(allpass_delay));

            self.loop_delay_length = cmp::min(loop_delay as usize, self.line.len());
        }
    }
}

impl<T: Float> AudioNode for Pluck<T> {
    const ID: u64 = 58;
    type Sample = T;
    type Inputs = U2;
    type Outputs = U1;

    fn reset(&mut self, sample_rate: Option<f64>) {
        if let Some(sr) = sample_rate {
            self.sample_rate = sr;
        }
        self.damping.reset(sample_rate);
        self.initialized = false;
    }

    #[inline]
    fn tick(
        &mut self,
        input: &Frame<Self::Sample, Self::Inputs>,
    ) -> Frame<Self::Sample, Self::Outputs> {
        if !self.initialized {
            self.initialize_line();
        }
        if input[1] != self.frequency {
            self.set_frequency(input[1]);
        }
        let output = self.line[self.pos] * self.gain + input[0];
        let output = self.damping.filter_mono(output);
        let output = self.tuning.filter_mono(output);
        self.line[self.pos] = output;
        self.pos += 1;
        if self.pos >= self.loop_delay_length {
            self.pos = 0;
        }
        [output].into()
    }

    fn set_hash(&mut self, hash: u64) {
        self.hash = hash;
        self.initialized = false;
    }

    fn route(&self, _input: &SignalFrame, _frequency: f64) -> SignalFrame {
        let mut output = new_signal_frame(self.outputs());
        output[0] = Signal::Latency(0.0);
        output
    }
}

/// Karplus-Strong oscillator.
/// - Input 0: string excitation.
/// - Input 1: frequency.
/// - Output 0: plucked string.
#[inline]
pub fn dsp_pluck<T: Real>(gain_per_second: f32, high_frequency_damping: f32) -> An<Pluck<T>> {
    An(Pluck::new(
        DEFAULT_SR,
        T::from_f32(1.0),
        T::from_f32(gain_per_second),
        T::from_f32(high_frequency_damping),
    ))
}
