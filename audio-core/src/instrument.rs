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
  // freq: 10000hz sr: 44100hz
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
  let frames = 8000;

  // https://arachnoid.com/BiQuadDesigner/index.html
  let noise_bandpass = Coefficients {
    a1 : -1.82982124,
    a2 : 0.98102294,
    b0 : 0.00948853,
    b1 : 0.0,
    b2 : -0.00948853
  };

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
    .filtered(noise_bandpass)
    .mul_amp(dumb(frames / 5));

  let sig = osc_a
    .add_amp(noise)
    .mul_amp(dumb(frames))
    .take(frames)
    .map(|s| s.to_sample());

  signal::from_iter(sig)
}

fn snare() -> impl Signal<Frame=f32> {
  // https://arachnoid.com/BiQuadDesigner/index.html
  // freq: 4000hz gain: 6 sr: 44100hz
  let high_peak = Coefficients {
    a1: -1.32576812,
    a2: 0.57463420,
    b0: 1.21167527,
    b1: -1.32576812,
    b2: 0.36295893
  };

  // https://arachnoid.com/BiQuadDesigner/index.html
  // freq: 200hz gain: 12 sr: 44100hz
  let low_peak = Coefficients {
    a1: -1.97920083,
    a2: 0.98000464,
    b0: 1.02980381,
    b1: -1.97920083,
    b2: 0.95020083
  };

  // https://arachnoid.com/BiQuadDesigner/index.html
  // freq: 1200hz sr: 44100hz
  let noise_high_pass = Coefficients {
    a1 : -1.75916841,
    a2 : 0.78519654,
    b0 : 0.88609124,
    b1 : -1.77218248,
    b2 : 0.88609124
  };

  // freq: 1200hz sr: 44100hz
  let oscs_high_pass = Coefficients {
    a1 : -1.91943335,
    a2 : 0.92255463,
    b0 : 0.96049700,
    b1 : -1.92099399,
    b2 : 0.96049700
  };

  let noise = signal::rate(SAMPLE_RATE)
    .const_hz(7000.0)
    .noise_simplex()
    .filtered(noise_high_pass);

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
    .filtered(oscs_high_pass);

  let output = sig
    .add_amp(noise)
    .filtered(high_peak)
    .filtered(low_peak)
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
