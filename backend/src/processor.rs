use js_sys;
use dasp::{Sample, Signal, signal::{self, ConstHz, Sine}};
use wasm_bindgen::prelude::*;

const FRAME_SIZE: usize = 128;

#[wasm_bindgen]
pub struct AudioProcessor {
  input_buffer: [Vec<f32>; 2], // 2 channel audio
  output_buffer: [Vec<f32>; 2], // 2 channel audio
  sig: Box<Sine<ConstHz>>
}

#[wasm_bindgen]
impl AudioProcessor {
  #[wasm_bindgen(constructor)]
  pub fn new() -> Self {
    // Iterator for 1kh sine wave
    let signal = signal::rate(44100.)
      .const_hz(100.)
      .sine();
    // returns pointer to processor
    AudioProcessor {
      input_buffer: [vec![0.0; FRAME_SIZE], vec![0.0; FRAME_SIZE]],
      output_buffer: [vec![0.0; FRAME_SIZE], vec![0.0; FRAME_SIZE]],
      sig: Box::new(signal)
    }
  }
  pub fn get_buffer(&self, channel: usize) -> Vec<f32> {
    self.output_buffer[channel].clone()
  }
  pub fn set_buffer(&mut self, channel: usize, data: Vec<f32>) {
    self.input_buffer[channel] = data
  }
  pub fn process(&mut self) {
    let samples: Vec<f32> = self.sig
      .as_mut()
      .take(FRAME_SIZE)
      .map(|s| s.to_sample())
      .collect();

    for channel in self.output_buffer.iter_mut() {
      *channel = samples.clone()
    }
  }
}