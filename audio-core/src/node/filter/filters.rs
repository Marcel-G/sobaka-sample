use dasp::{Sample, Signal};

use crate::util::filtered_signal::Coefficients;

/// High Pass
pub struct HighPass<C, Q>
where
    C: Signal<Frame = f64>,
    Q: Signal<Frame = f64>,
{
    center_freq: C,
    q: Q,
    sample_rate: f64,
}

impl<C, Q> HighPass<C, Q>
where
    C: Signal<Frame = f64>,
    Q: Signal<Frame = f64>,
{
    pub fn new(center_freq: C, q: Q, sample_rate: f64) -> Self {
        Self {
            center_freq,
            q,
            sample_rate,
        }
    }
}

impl<C, Q> Iterator for HighPass<C, Q>
where
    C: Signal<Frame = f64>,
    Q: Signal<Frame = f64>,
{
    type Item = Coefficients<f64>;

    fn next(&mut self) -> Option<Self::Item> {
        let omega = 2. * std::f64::consts::PI * self.center_freq.next() / self.sample_rate;
        let sn = f64::sin(omega);
        let cs = f64::cos(omega);
        let alpha = sn / (2. * self.q.next());
        let filter = Coefficients {
            b0: ((1. + cs) / 2.).to_sample(),
            b1: (-(1. + cs)).to_sample(),
            b2: ((1. + cs) / 2.).to_sample(),
            a1: (-2. * cs).to_sample(),
            a2: (1. - alpha).to_sample(),
        };

        let a0 = (1.0 + alpha).to_sample();

        Some(Coefficients::normalise(filter, a0))
    }
}

/// Low Pass
pub struct LowPass<C, Q>
where
    C: Signal<Frame = f64>,
    Q: Signal<Frame = f64>,
{
    center_freq: C,
    q: Q,
    sample_rate: f64,
}

impl<C, Q> LowPass<C, Q>
where
    C: Signal<Frame = f64>,
    Q: Signal<Frame = f64>,
{
    pub fn new(center_freq: C, q: Q, sample_rate: f64) -> Self {
        Self {
            center_freq,
            q,
            sample_rate,
        }
    }
}

impl<C, Q> Iterator for LowPass<C, Q>
where
    C: Signal<Frame = f64>,
    Q: Signal<Frame = f64>,
{
    type Item = Coefficients<f64>;

    fn next(&mut self) -> Option<Self::Item> {
        let omega = 2. * std::f64::consts::PI * self.center_freq.next() / self.sample_rate;
        let sn = f64::sin(omega);
        let cs = f64::cos(omega);
        let alpha = sn / (2. * self.q.next());
        let filter = Coefficients {
            b0: ((1. - cs) / 2.).to_sample(),
            b1: (1. - cs).to_sample(),
            b2: ((1. - cs) / 2.).to_sample(),
            a1: (-2. * cs).to_sample(),
            a2: (1. - alpha).to_sample(),
        };

        let a0 = (1.0 + alpha).to_sample();

        Some(Coefficients::normalise(filter, a0))
    }
}

/// Band Pass
pub struct BandPass<C, Q>
where
    C: Signal<Frame = f64>,
    Q: Signal<Frame = f64>,
{
    center_freq: C,
    q: Q,
    sample_rate: f64,
}

impl<C, Q> BandPass<C, Q>
where
    C: Signal<Frame = f64>,
    Q: Signal<Frame = f64>,
{
    pub fn new(center_freq: C, q: Q, sample_rate: f64) -> Self {
        Self {
            center_freq,
            q,
            sample_rate,
        }
    }
}

impl<C, Q> Iterator for BandPass<C, Q>
where
    C: Signal<Frame = f64>,
    Q: Signal<Frame = f64>,
{
    type Item = Coefficients<f64>;

    fn next(&mut self) -> Option<Self::Item> {
        let omega = 2. * std::f64::consts::PI * self.center_freq.next() / self.sample_rate;
        let sn = f64::sin(omega);
        let cs = f64::cos(omega);
        let alpha = sn / (2. * self.q.next());
        let filter = Coefficients {
            b0: alpha.to_sample(),
            b1: (0.).to_sample(),
            b2: (-alpha).to_sample(),
            a1: (-2. * cs).to_sample(),
            a2: (1. - alpha).to_sample(),
        };

        let a0 = (1.0 + alpha).to_sample();
        Some(Coefficients::normalise(filter, a0))
    }
}

/// Peak
pub struct Peak<C, Q, G>
where
    C: Signal<Frame = f64>,
    Q: Signal<Frame = f64>,
    G: Signal<Frame = f64>,
{
    center_freq: C,
    q: Q,
    gain_db: G,
    sample_rate: f64,
}

impl<C, Q, G> Peak<C, Q, G>
where
    C: Signal<Frame = f64>,
    Q: Signal<Frame = f64>,
    G: Signal<Frame = f64>,
{
    pub fn new(center_freq: C, q: Q, gain_db: G, sample_rate: f64) -> Self {
        Self {
            center_freq,
            q,
            sample_rate,
            gain_db,
        }
    }
}

impl<C, Q, G> Iterator for Peak<C, Q, G>
where
    C: Signal<Frame = f64>,
    Q: Signal<Frame = f64>,
    G: Signal<Frame = f64>,
{
    type Item = Coefficients<f64>;

    fn next(&mut self) -> Option<Self::Item> {
        let omega = 2. * std::f64::consts::PI * self.center_freq.next() / self.sample_rate;
        let gain_abs = 10.0_f64.powf(self.gain_db.next() / 40.);
        let sn = f64::sin(omega);
        let cs = f64::cos(omega);
        let alpha = sn / (2. * self.q.next());

        let filter = Coefficients {
            b0: (1. + (alpha * gain_abs)).to_sample(),
            b1: (-2. * cs).to_sample(),
            b2: (1. - (alpha * gain_abs)).to_sample(),
            a1: (-2. * cs).to_sample(),
            a2: (1. - (alpha / gain_abs)).to_sample(),
        };

        let a0 = (1.0 + (alpha / gain_abs)).to_sample();
        Some(Coefficients::normalise(filter, a0))
    }
}
