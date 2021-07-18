use wasm_bindgen::prelude::*;
use sobaka_sample_audio_core::{sequencer::{InstrumentKind, NewInstrument, Sequencer}};
use serde_wasm_bindgen;
use serde::{Serialize};
use js_sys;
mod utils;
mod get_random;

const FRAME_SIZE: usize = 128;

fn bind_js_callback<T: Serialize>(func: js_sys::Function) -> Box<dyn Fn(&T)> {
  let this = JsValue::null();
  Box::new(move |_value: &T| {
    let value = serde_wasm_bindgen::to_value(_value).unwrap();
    let _ = func.call1(&this, &value);
  })
}
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
  pub fn new(
    on_active_step: js_sys::Function,
    on_is_playing: js_sys::Function,
    on_sequence: js_sys::Function,
    on_instruments: js_sys::Function
  ) -> Self {
    let on_active_step = bind_js_callback(on_active_step);
    let on_is_playing = bind_js_callback(on_is_playing);
    let on_sequence = bind_js_callback(on_sequence); 
    let on_instruments = bind_js_callback(on_instruments);

    let sequencer = Sequencer::new(
      16,
      on_active_step,
      on_is_playing,
      on_sequence,
      on_instruments 
    );

    AudioProcessor {
      input_buffer: [vec![0.0; FRAME_SIZE], vec![0.0; FRAME_SIZE]],
      output_buffer: [vec![0.0; FRAME_SIZE], vec![0.0; FRAME_SIZE]],
      sequencer: Box::new(sequencer),
    }
  }
  pub fn play(&mut self) {
    self.sequencer.play();
  }

  pub fn stop(&mut self) {
    self.sequencer.stop();
  }

  pub fn add_instrument(&mut self, new_instrument: JsValue) {
    let new_instrument: NewInstrument = serde_wasm_bindgen::from_value(new_instrument).unwrap();
    self.sequencer.add_instrument(new_instrument);
  }

  pub fn destroy_instrument(&mut self, instrument_uuid: &str) {
    if let Some(instrument) = self.sequencer.get_instrument(instrument_uuid) {
      self.sequencer.destroy_instrument(instrument)
    }
  }

  pub fn assign_instrument(&mut self, step: usize, instrument_uuid: &str) {
    if let Some(instrument) = self.sequencer.get_instrument(instrument_uuid) {
      self.sequencer.assign_instrument(step, instrument)
    }
  }

  pub fn unassign_instrument(&mut self, step: usize, instrument_uuid: &str) {
    if let Some(instrument) = self.sequencer.get_instrument(instrument_uuid) {
      self.sequencer.unassign_instrument(step, instrument)
    }
  }

  pub fn trigger_instrument(&mut self, instrument_uuid: &str) {
    if let Some(instrument) = self.sequencer.get_instrument(instrument_uuid) {
      self.sequencer.trigger_instrument(instrument)
    }
  }

  pub fn get_buffer(&self, channel: usize) -> Vec<f32> {
    self.output_buffer[channel].clone()
  }

  pub fn set_buffer(&mut self, channel: usize, data: Vec<f32>) {
    self.input_buffer[channel] = data
  }

  pub fn process(&mut self) {
    let master: Vec<f32> = self.sequencer.tick(FRAME_SIZE);

    for channel in self.output_buffer.iter_mut() {
      *channel = master.clone()
    }
  }
}