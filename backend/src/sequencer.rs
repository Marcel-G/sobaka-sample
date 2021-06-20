use dasp::{ Signal };
use web_sys::console;

use crate::instrument::{ get_instrument, InstrumentType };

// 16 spot sequencer for instruments
pub struct Sequencer {
  tick: usize,
  tempo: usize, // Tempo on bpm
  step: usize, // 8 steps
  sequence: [Option<InstrumentType>; 16],
  active_instruments: Vec<Box<dyn Signal<Frame=f32>>>
}

impl Sequencer {
  pub fn new() -> Self {
    Self {
      tempo: 140,
      tick: 0,
      step: 0,
      sequence: [
        // Static sequence for testing
        // @todo should support multiple instruments on the same location
        Some(InstrumentType::Hat), Some(InstrumentType::Hat), Some(InstrumentType::Hat), Some(InstrumentType::Hat),
        Some(InstrumentType::Hat), Some(InstrumentType::Hat), Some(InstrumentType::Hat), Some(InstrumentType::Hat),
        Some(InstrumentType::Hat), Some(InstrumentType::Hat), Some(InstrumentType::Hat), Some(InstrumentType::Hat),
        Some(InstrumentType::Hat), Some(InstrumentType::Hat), Some(InstrumentType::Hat), Some(InstrumentType::Hat),
      ],
      active_instruments: vec![]
    }
  }

  // Tick will be called each
  // @todo might be better to base stepping on a real timer
  pub fn tick(&mut self, size: usize) {
    const SAMPLE_RATE: usize = 44100; // samples per second
    self.tick += size;
    let hz = 60. / self.tempo as f32;

    if self.tick as f32 / SAMPLE_RATE as f32 >= hz {
      self.tick = 0;
      self.step();
    }
  }

  fn step(&mut self) {
    if let Some(instrument) = self.sequence[self.step] {
      self.active_instruments.push(get_instrument(instrument));
    }

    self.active_instruments
      .retain(|instrument| !instrument.is_exhausted());

    if self.step >= 15 {
      self.step = 0
    } else {
      self.step += 1;
    }
  }
}

impl Signal for Sequencer {
  type Frame = f32;

  fn next(&mut self) -> Self::Frame {
    if self.active_instruments.len() > 0 {
      self.active_instruments
        .iter_mut()
        .map(|i| i.as_mut().next())
        // I'm sure this is not the right way to mix audio channels
        .fold(0.0, |a, b| a + b)

    } else {
      0.0
    }
  }
}