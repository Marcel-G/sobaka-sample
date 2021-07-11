use wasm_bindgen::prelude::*;
use sobaka_sample_audio_core::{sequencer::Sequencer};
use js_sys;

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
  pub fn new(on_step: js_sys::Function) -> Self {

    // Convert js function to boxed closure
    // @todo should this be a generic on_event callback?
    let this = JsValue::null();
    let cb = Box::new(move |step: usize| {
      let step_js = JsValue::from(step as u32);
      let _ = on_step.call1(&this, &step_js);
    });

    AudioProcessor {
      input_buffer: [vec![0.0; FRAME_SIZE], vec![0.0; FRAME_SIZE]],
      output_buffer: [vec![0.0; FRAME_SIZE], vec![0.0; FRAME_SIZE]],
      sequencer: Box::new(Sequencer::new(cb)),
    }
  }
  pub fn play(&mut self) {
    self.sequencer.play();
  }

  pub fn stop(&mut self) {
    self.sequencer.stop();
  }

  pub fn update_sample(&mut self, track: usize, sample: usize, value: bool) {
    self.sequencer.update_sample(track, sample, value);
  }

  pub fn get_buffer(&self, channel: usize) -> Vec<f32> {
    self.output_buffer[channel].clone()
  }
  pub fn set_buffer(&mut self, channel: usize, data: Vec<f32>) {
    self.input_buffer[channel] = data
  }
  pub fn process(&mut self) {
    let master: Vec<f32> = self.sequencer.tick(128);

    for channel in self.output_buffer.iter_mut() {
      *channel = master.clone()
    }
  }
}