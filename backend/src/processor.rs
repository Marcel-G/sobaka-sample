use js_sys;
use wasm_bindgen::prelude::*;
const FRAME_SIZE: usize = 128;

#[wasm_bindgen]
pub struct AudioProcessor {
  input_buffer: [Vec<f32>; 2], // 2 channel audio
  output_buffer: [Vec<f32>; 2] // 2 channel audio
}

#[wasm_bindgen]
impl AudioProcessor {
  #[wasm_bindgen(constructor)]
  pub fn new() -> Self {
    // returns pointer to processor
    AudioProcessor {
      input_buffer: [vec![0.0; FRAME_SIZE], vec![0.0; FRAME_SIZE]],
      output_buffer: [vec![0.0; FRAME_SIZE], vec![0.0; FRAME_SIZE]]
    }
  }
  pub fn get_buffer(&self, channel: usize) -> Vec<f32> {
    self.output_buffer[channel].clone()
  }
  pub fn set_buffer(&mut self, channel: usize, data: Vec<f32>) {
    self.input_buffer[channel] = data
  }
  pub fn process(&mut self) {
    for (inp, outp) in self.input_buffer.iter().zip(self.output_buffer.iter_mut()) {
      for i in 0..FRAME_SIZE {
        outp[i] = 2.0 * (js_sys::Math::random() as f32 - 0.5);
      }
    };
  }
}