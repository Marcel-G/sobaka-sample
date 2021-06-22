use dasp::{ Sample, Signal, signal };

#[derive(Clone, Copy)]
pub enum InstrumentType {
  Kick,
  Snare,
  Hat
}

// Instrument produces some sound
fn hat() -> impl Signal<Frame=f32> {
  let hz = signal::rate(44100.).const_hz(440.0);
  let t = 44100 / 10;
  let sig = hz
    .clone()
    .sine()
    .take(t)
    .chain(hz.clone().saw().take(t))
    .chain(hz.clone().square().take(t))
    .chain(hz.clone().noise_simplex().take(t))
    .map(|s| s.to_sample());

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