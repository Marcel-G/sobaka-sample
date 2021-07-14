use std::{rc::{Rc, Weak}};
use dasp::{Sample, Signal};
use serde::{ Serialize, Deserialize };
use uuid::Uuid;
use crate::synth::{SynthKind, get_synth};

#[derive(Serialize, Deserialize)]
pub enum InstrumentKind {
  Synth
}

type Voice = Box<dyn Signal<Frame=f32>>;

// Sendable instrument

#[derive(Serialize)]
pub struct Instrument {
  pub uuid: Uuid,
  pub kind: InstrumentKind,
  pub envelope: Vec<f32>,
  pub muted: bool
}

#[derive(Deserialize)]
pub struct NewInstrument {
  pub kind: InstrumentKind,
  pub data: Option<Vec<f32>>
}

type Instruments = Vec<Rc<Instrument>>;
type SequenceLayout = Vec<Vec<Weak<Instrument>>>;

type Notifier<T> = Box<dyn Fn(&T)>;

struct Notify<T> {
  inner: T,
  callback: Notifier<T>
}

impl<T> Notify<T> {
  fn new(inner: T, callback: Notifier<T>) -> Self {
    Self { inner, callback }
  }
  fn commit<U>(&mut self, updater: U)
  where
    U: FnOnce(&mut T) {
    updater(&mut self.inner);
    self.notify()
  }
  fn notify(&self) {
    (self.callback)(&self.inner);
  }
}

impl<T> AsRef<T> for Notify<T> {
  fn as_ref(&self) -> &T {
    &self.inner
  }
}

pub struct Sequencer {
  is_playing: Notify<bool>,
  instruments: Notify<Instruments>,
  sequence: Notify<SequenceLayout>,
  active_step: Notify<usize>,

  steps: usize,
  tempo: usize,
  tick: usize,
  active_voices: Vec<Voice>,
}

impl Sequencer {
  pub fn new(
    steps: usize,
    on_active_step: Notifier<usize>,
    on_is_playing: Notifier<bool>,
    on_sequence: Notifier<SequenceLayout>,
    on_instruments: Notifier<Instruments>,
  ) -> Self {
    Self {
      is_playing: Notify::new(false, on_is_playing),
      instruments: Notify::new(vec![], on_instruments),
      sequence: Notify::new(vec![vec![]; steps], on_sequence),
      active_step: Notify::new(0, on_active_step),
      steps,
      tempo: 60,
      tick: 0,
      active_voices: vec![],
    }
  }

  pub fn get_instrument(&self, uuid_str: &str) -> Option<Weak<Instrument>> {
    if let Ok(uuid) = Uuid::parse_str(uuid_str) {
      if let Some(instrument) = self.instruments
        .as_ref()
        .iter()
        .find(|instrument| instrument.uuid == uuid) {
        return Some(Rc::downgrade(instrument))
      }
    }

    None
  } 

  pub fn play(&mut self) {
    self.tick = 0;
    self.is_playing.commit(|is_playing| {
      *is_playing = true;
    });
    self.active_step.commit(|active_step| {
      *active_step = 0;
    });
  }

  pub fn stop(&mut self) {
    self.is_playing.commit(|is_playing| {
      *is_playing = false;
    });
  }

  // Tick will be called each
  pub fn tick(&mut self, size: usize) -> Vec<f32> {
    const SAMPLE_RATE: usize = 44100; // samples per second
    self.tick += size;
    let hz = (60. / self.tempo as f32) / 8.0;

    if *self.is_playing.as_ref() {
    // @todo might be better to base stepping on a real timer
      if self.tick as f32 / SAMPLE_RATE as f32 >= hz {
        self.tick = 0;
        self.step();
      }
    }

    // Return n samples
    self.take(size).collect()
  }

  fn step(&mut self) {
    if self.active_step.as_ref() >= &(self.steps - 1) {
      self.active_step.commit(|active_step| {
        *active_step = 0;
      })
    } else {
      self.active_step.commit(|active_step| {
        *active_step += 1;
      });
    }

    let sequence = self.sequence.as_ref();

    let step = &sequence[*self.active_step.as_ref()];

    for sample in step.iter() {
      let kind = &sample.upgrade().unwrap().kind;

      self.active_voices.push(self.get_voice(kind))
    }

    self.active_voices
      .retain(|instrument| !instrument.is_exhausted());
  }

  fn get_voice(&self, kind: &InstrumentKind) -> Voice {
    match kind {
       InstrumentKind::Synth => get_synth(SynthKind::Hat)
    }
  }

  pub fn add_instrument(&mut self, new: NewInstrument) {
    let uuid = Uuid::new_v4();

    let instrument = Instrument {
      uuid,
      kind: new.kind,
      envelope: vec![],
      muted: false
    };

    self.instruments.commit(|instruments| {
      instruments.push(Rc::new(instrument));
    });
  }

  pub fn destroy_instrument(&mut self, instrument: Weak<Instrument>) {
    // Find instrument in sequence and remove it
    self.sequence.commit(|sequence| {
      for step in sequence.iter_mut() {
        step.retain(|_instrument| {
          !instrument.ptr_eq(_instrument)
        })
      };
    });

    // Find instrument in instruments and remove it
    self.instruments.commit(|instruments| {
      instruments.retain(|_instrument| {
        !instrument.ptr_eq(&Rc::downgrade(_instrument))
      })
    })
  }

  pub fn assign_instrument(&mut self, step: usize, instrument: Weak<Instrument>) {
    // Check step is in range

    // @todo prevent assignment of an instrument to a step multiple times

    // Add instrument to step
    self.sequence.commit(|sequence| {
      sequence[step].push(instrument)
    });
  }

  pub fn unassign_instrument(&mut self, step: usize, instrument: Weak<Instrument>) {
    // Remove instrument from sequence
    self.sequence.commit(|sequence| {
      sequence[step].retain(|_instrument| {
        !instrument.ptr_eq(_instrument)
      })
    });
  }

  pub fn trigger_instrument(&mut self, instrument: Weak<Instrument>) {
    let kind = &instrument.upgrade().unwrap().kind;
    
    let voice = self.get_voice(kind);

    self.active_voices.push(voice);
  }
}

impl Signal for Sequencer {
  type Frame = f32;

  fn next(&mut self) -> Self::Frame {
    if self.active_voices.len() > 0 {
      self.active_voices
        .iter_mut()
        .map(|i| i.as_mut().next())
        .fold(Self::Frame::EQUILIBRIUM, Sample::add_amp)

    } else {
      0.0
    }
  }
}

unsafe impl Send for Sequencer {}
