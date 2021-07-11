use dasp::{Sample, Signal};

use crate::instrument::{ get_instrument, InstrumentType };

const STATIC_SEQUENCE: [[bool; 16]; 3] = [
  /* Hat   */ [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true],
  /* Snare */ [true, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
  /* Kick  */ [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false]
];

// 16 spot sequencer for instruments
pub struct Sequencer {
  is_playing: bool,
  tick: usize,
  tempo: usize, // Tempo on bpm
  head: usize,
  tracks: [InstrumentType; 3],
  sequence: [[bool; 16]; 3],
  active_instruments: Vec<Box<dyn Signal<Frame=f32>>>,
  on_step: Box<dyn Fn(usize)>
}

impl Sequencer {
  pub fn new(on_step: Box<dyn Fn(usize)>) -> Self {
    Self {
      is_playing: false,
      tracks: [InstrumentType::Hat, InstrumentType::Snare, InstrumentType::Kick],
      tempo: 60,
      tick: 0,
      head: 0,
      sequence: STATIC_SEQUENCE,
      active_instruments: vec![],
      on_step: on_step
    }
  }
  pub fn play(&mut self) {
    self.is_playing = true;
    self.tick = 0;
    self.head = 0;
  }

  pub fn stop(&mut self) {
    self.is_playing = false;
  }

  pub fn update_sample(&mut self, track: usize, sample: usize, value: bool) {
    self.sequence[track][sample] = value;
  }

  // Tick will be called each
  pub fn tick(&mut self, size: usize) -> Vec<f32> {
    if !self.is_playing {
      return vec![0.0; size]
    }
    const SAMPLE_RATE: usize = 44100; // samples per second
    self.tick += size;
    let hz = (60. / self.tempo as f32) / 8.0;

    // @todo might be better to base stepping on a real timer
    if self.tick as f32 / SAMPLE_RATE as f32 >= hz {
      self.tick = 0;
      self.step();
    }

    // Return n samples
    self.take(size).collect()
  }

  fn step(&mut self) {
    if self.head >= 15 {
      self.head = 0;
    } else {
      self.head += 1;
    }

    // Call on_step callback;
    (self.on_step)(self.head);

    for (track_sequence, instrument) in self.sequence.iter().zip(self.tracks.iter()) {
      if track_sequence[self.head] {
        self.active_instruments.push(get_instrument(*instrument));
      }
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