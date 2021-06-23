use dasp::{ Sample, Signal, signal };

#[derive(Clone, Copy)]
pub enum InstrumentType {
  Kick,
  Snare,
  Hat
}

// Instrument produces some sound

// https://www.soundonsound.com/techniques/synthesizing-bells
fn hat() -> impl Signal<Frame=f32> {
  const FUNDAMENTAL: f64 = 40.;
  const OSCILATOR_RATIOS: [f64; 6] = [2., 3., 4.16, 5.43, 6.79, 8.21];
  let mut oscilators = OSCILATOR_RATIOS
    .iter()
    .map(|ratio| {
      signal::rate(44100.)
        .const_hz(FUNDAMENTAL * ratio)
        .sine()
    })
    .collect::<Vec<_>>();
  
  let sig = signal::equilibrium()
    .map(move |_: f64| {
      oscilators
        .iter_mut()
        .map(|sig| sig.next())
        .sum()
    })
    .take(10000 * 2)
    .map(|s: f64| s.to_sample::<f32>());

  signal::from_iter(sig)
}

fn kick() -> impl Signal<Frame=f32> {
  let sig = signal::rate(44100.)
    .const_hz(300.)
    .sine()
    .take(44100 / 5)
    .map(|s| s.to_sample());

  signal::from_iter(sig)
}

fn snare() -> impl Signal<Frame=f32> {
  let sig = signal::rate(44100.)
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
