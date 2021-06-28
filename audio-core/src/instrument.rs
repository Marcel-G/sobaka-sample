use dasp::{Sample, Signal, signal};

use crate::{envelope::{ dumb }, filter::{ SignalFilter, Coefficients }};

#[derive(Clone, Copy)]
pub enum InstrumentType {
  Kick,
  Snare,
  Hat
}

// 😬
const SAMPLE_RATE: f64 = 44100.;

// Instrument produces some sound

// https://www.soundonsound.com/techniques/synthesizing-bells
fn hat() -> impl Signal<Frame=f32> {
  const FUNDAMENTAL: f64 = 40.;
  const OSCILATOR_RATIOS: [f64; 6] = [2., 3., 4.16, 5.43, 6.79, 8.21];

  let mut oscilators = OSCILATOR_RATIOS
    .iter()
    .map(|ratio| {
      signal::rate(SAMPLE_RATE)
        .const_hz(FUNDAMENTAL * ratio)
        .square()
    })
    .collect::<Vec<_>>();

  let frames = 5000;
  
  let sig = signal::gen_mut(move || {
      oscilators
        .iter_mut()
        .map(Signal::next)
        .fold(f64::EQUILIBRIUM, Sample::add_amp)
    })
    .mul_amp(dumb(frames));

  let filtered = sig
    .filtered(Coefficients::bandpass(10000., SAMPLE_RATE, 0.707))
    .filtered(Coefficients::highpass(7000., SAMPLE_RATE, 0.707));
  
  let output = filtered
    .take(frames)
    .map(Sample::to_sample::<f32>);

  signal::from_iter(output)
}

fn kick() -> impl Signal<Frame=f32> {
  let frames = 8000;

  let detune = 65.41;

  let detune_a = signal::gen(move || detune)
    .mul_amp(dumb(frames / 2))
    .map(|d| 65.41 + d);

  let osc_a = signal::rate(SAMPLE_RATE)
    .hz(detune_a)
    .sine();

  let noise = signal::rate(SAMPLE_RATE)
    .const_hz(7000.0)
    .noise_simplex()
    .filtered(Coefficients::bandpass(1380. * 2.0, SAMPLE_RATE, 0.707))
    .mul_amp(dumb(frames / 5));

  let sig = osc_a
    .add_amp(noise)
    .mul_amp(dumb(frames))
    .take(frames)
    .map(|s| s.to_sample());

  signal::from_iter(sig)
}

fn snare() -> impl Signal<Frame=f32> {
  let noise = signal::rate(SAMPLE_RATE)
    .const_hz(7000.0)
    .noise_simplex()
    .filtered(Coefficients::highpass(1200., SAMPLE_RATE, 0.707));

  let frames = 6000;
  let detune = 130.81;

  let detune_a = signal::gen(move || detune)
    .mul_amp(dumb(frames / 2))
    .map(|d| 130.81 + d);

  let osc_a = signal::rate(SAMPLE_RATE)
    .hz(detune_a)
    .sine()
    .mul_amp(signal::gen(|| -1.0));

  let detune_b = signal::gen(move || detune)
    .mul_amp(dumb(frames / 2))
    .map(|d| 130.81 * 2. + d);

  let osc_b = signal::rate(SAMPLE_RATE)
    .hz(detune_b)
    .sine();
  
  let sig = osc_a
    .add_amp(osc_b)
    .filtered(Coefficients::highpass(400., SAMPLE_RATE, 0.707));

  let output = sig
    .add_amp(noise)
    .filtered(Coefficients::peak(4000., SAMPLE_RATE, 0.707, 6.0))
    .filtered(Coefficients::peak(200., SAMPLE_RATE, 0.707, 12.0))
    .mul_amp(dumb(frames))
    .take(frames)
    .map(Sample::to_sample::<f32>);

  signal::from_iter(output)
}

// @todo look into dasp `boxed` feature:
// The boxed feature (or signal-boxed feature if using dasp) provides
// a Signal implementation for Box<dyn Signal>.
pub fn get_instrument(instrument: InstrumentType) -> Box<dyn Signal<Frame = f32>> {
  match instrument {
    InstrumentType::Hat => Box::new(hat()),
    InstrumentType::Kick => Box::new(kick()),
    InstrumentType::Snare => Box::new(snare())
  }
}
