use wasm_bindgen::prelude::*;
use dasp::ring_buffer::Bounded;
use std::{sync::{Arc, Mutex}};
use rpc::Messenger;
use sobaka_sample_audio_core::{AudioCore, modules::AudioModule};
use web_sys::{MessagePort};

use crate::rpc::connect;

mod utils;
pub mod api;
mod rpc;
pub mod subscriptions;
mod get_random;
pub mod module;

const FRAME_SIZE: usize = 128;
// AudioProcessor is the rust entry-point for Web Audio AudioWorkletProcessor
#[wasm_bindgen]
pub struct AudioProcessor {
  output_buffer: Bounded<[f32; FRAME_SIZE]>,
  core: Arc<Mutex<AudioCore>>,
  messenger: Messenger,
}

#[wasm_bindgen]
impl AudioProcessor {
  #[wasm_bindgen(constructor)]
  pub fn new(port: MessagePort) -> Self {
    // Setup audio core
    let core = Arc::new(Mutex::new(AudioCore::new()));

    let messenger = connect(port, core.clone());

    AudioProcessor {
      output_buffer: Bounded::from([0.0; FRAME_SIZE]),
      core,
      messenger
    }
  }

  pub fn get_buffer(&mut self, _channel: usize) -> Vec<f32> {
    // self.output_buffer[channel].clone()
    self.output_buffer.drain()
      .take(FRAME_SIZE)
      .collect()
  }

  pub fn set_buffer(&mut self, _channel: usize, _data: Vec<f32>) {
    // self.input_buffer[channel] = data
  }

  pub fn process(&mut self) {
    let mut core = self.core.lock().unwrap();
    let option_sink = core.modules.iter().find_map(|module| match module {
      AudioModule::Sink(sink) => Some(sink),
      _ => None
    });

    if let Some(module) = option_sink {
      if let Some(sink_node) = module.sink {
        while !self.output_buffer.is_full() {
          core.graph.process(sink_node);
          // output is 64 samples long
          let outputs = &core.graph.graph.node_weight(sink_node).expect("").buffers;
          for output in outputs[0].iter() {
            self.output_buffer.push(*output);
          }
        }
      }
    }
  }
}

#[wasm_bindgen]
pub fn set_panic_hook() {
  console_error_panic_hook::set_once();
}

#[wasm_bindgen(start)]
pub fn main() {
  set_panic_hook();
}