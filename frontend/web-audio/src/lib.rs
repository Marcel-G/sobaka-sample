use wasm_bindgen::prelude::*;
use sobaka_sample_audio_core::{sequencer::Sequencer};

const FRAME_SIZE: usize = 128;
// AudioProcessor is the rust entry-point for Web Audio AudioWorkletProcessor
#[wasm_bindgen]
pub struct AudioProcessor {
  input_buffer: [Vec<f32>; 2], // 2 channel audio
  output_buffer: [Vec<f32>; 2], // 2 channel audio
  sequencer: Box<Sequencer>,
  // mixer: Mixer
}

#[wasm_bindgen]
impl AudioProcessor {
  #[wasm_bindgen(constructor)]
  pub fn new() -> Self {
    // returns pointer to processor
    AudioProcessor {
      input_buffer: [vec![0.0; FRAME_SIZE], vec![0.0; FRAME_SIZE]],
      output_buffer: [vec![0.0; FRAME_SIZE], vec![0.0; FRAME_SIZE]],
      sequencer: Box::new(Sequencer::new()),
    }
  }
  pub fn get_buffer(&self, channel: usize) -> Vec<f32> {
    self.output_buffer[channel].clone()
  }
  pub fn set_buffer(&mut self, channel: usize, data: Vec<f32>) {
    self.input_buffer[channel] = data
  }
  pub fn process(&mut self) {
    self.sequencer.tick(128);

    let master: Vec<f32> = self.sequencer.tick(128);

    for channel in self.output_buffer.iter_mut() {
      *channel = master.clone()
    }
  }
}