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

  // https://arachnoid.com/BiQuadDesigner/index.html
  // freq: 10000z sr: 44100hz
  let bandpass = Coefficients {
    a1: -0.17123075,
    a2: 0.17668821,
    b0: 0.41165589,
    b1: 0.0,
    b2: -0.41165589,
  };

  // freq: 7000hz sr: 44100hz
  let highpass = Coefficients {
    a1: -0.68070239,
    a2: 0.25464396,
    b0: 0.48383659,
    b1: -0.96767317,
    b2: 0.48383659,
  };

  let filtered = sig
    .filtered(bandpass)
    .filtered(highpass);
  
  let output = filtered
    .take(frames)
    .map(Sample::to_sample::<f32>);

  signal::from_iter(output)
}

fn kick() -> impl Signal<Frame=f32> {
  let sig = signal::rate(SAMPLE_RATE)
    .const_hz(300.)
    .sine()
    .take(44100 / 5)
    .map(|s| s.to_sample());

  signal::from_iter(sig)
}

fn snare() -> impl Signal<Frame=f32> {
  let sig = signal::rate(SAMPLE_RATE)
    .const_hz(500.)
    .saw()
    .take(44100 / 4)
    .map(|s| s.to_sample());

  signal::from_iter(sig)
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
