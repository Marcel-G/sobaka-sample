use dasp::{Sample, Signal};

use crate::instrument::{ get_instrument, InstrumentType };

const STATIC_SEQUENCE: [Option<InstrumentType>; 16] = [
  // Static sequence for testing
  // @todo should support multiple instruments on the same location
  Some(InstrumentType::Kick), None, Some(InstrumentType::Hat), None,
  Some(InstrumentType::Snare), None, Some(InstrumentType::Hat), None,
  Some(InstrumentType::Kick), None, Some(InstrumentType::Hat), None,
  Some(InstrumentType::Snare), None, Some(InstrumentType::Hat), None,
];

// 16 spot sequencer for instruments
pub struct Sequencer {
  tick: usize,
  tempo: usize, // Tempo on bpm
  sequence: Box<dyn Iterator<Item=Option<InstrumentType>>>,
  active_instruments: Vec<Box<dyn Signal<Frame=f32>>>
}

impl Sequencer {
  pub fn new() -> Self {
    let sequence = STATIC_SEQUENCE
      .iter()
      .cycle();

    Self {
      tempo: 100,
      tick: 0,
      sequence: Box::new(sequence.cloned()),
      active_instruments: vec![]
    }
  }

  // Tick will be called each
  pub fn tick(&mut self, size: usize) -> Vec<f32> {
    const SAMPLE_RATE: usize = 44100; // samples per second
    self.tick += size;
    let hz = 60. / self.tempo as f32;

    // @todo might be better to base stepping on a real timer
    if self.tick as f32 / SAMPLE_RATE as f32 >= hz {
      println!("tick");
      self.tick = 0;
      self.step();
    }

    // Return n samples
    self.take(size).collect()
  }

  fn step(&mut self) {
    if let Some(Some(instrument)) = self.sequence.next() {
      self.active_instruments.push(get_instrument(instrument));
    }

    self.active_instruments
      .retain(|instrument| !instrument.is_exhausted());
  }
}

impl Signal for Sequencer {
  type Frame = f32;

  fn next(&mut self) -> Self::Frame {
    if self.active_instruments.len() > 0 {
      self.active_instruments
        .iter_mut()
        .map(|i| i.as_mut().next())
        .fold(Self::Frame::EQUILIBRIUM, Sample::add_amp)

    } else {
      0.0
    }
  }
}

// 😬
unsafe impl Send for Sequencer {}