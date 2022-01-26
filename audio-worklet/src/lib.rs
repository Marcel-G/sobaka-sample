use dasp::ring_buffer::Bounded;
use rpc::Messenger;
use sobaka_sample_audio_core::graph::AudioGraph;
use std::sync::{Arc, Mutex};
use wasm_bindgen::prelude::*;
use web_sys::MessagePort;

use crate::rpc::connect;

pub mod api;
mod get_random;
pub mod graph_rpc;
mod rpc;
pub mod subscriptions;
mod utils;

const FRAME_SIZE: usize = 128;
// AudioProcessor is the rust entry-point for Web Audio AudioWorkletProcessor
#[wasm_bindgen]
pub struct AudioProcessor {
    output_buffer: Bounded<[f32; FRAME_SIZE]>,
    graph: Arc<Mutex<AudioGraph>>,
    messenger: Messenger,
}

#[wasm_bindgen]
impl AudioProcessor {
    #[wasm_bindgen(constructor)]
    pub fn new(port: MessagePort) -> Self {
        // Setup audio core
        let graph = Arc::new(Mutex::new(AudioGraph::new()));

        let messenger = connect(port, graph.clone());

        AudioProcessor {
            output_buffer: Bounded::from([0.0; FRAME_SIZE]),
            graph,
            messenger,
        }
    }

    pub fn get_buffer(&mut self, _channel: usize) -> Vec<f32> {
        // self.output_buffer[channel].clone()
        self.output_buffer.drain().take(FRAME_SIZE).collect()
    }

    pub fn set_buffer(&mut self, _channel: usize, _data: Vec<f32>) {
        // self.input_buffer[channel] = data
    }

    pub fn process(&mut self) {
        let mut graph = self.graph.lock().unwrap();
        let sinks = graph.sinks();

        // @todo zip sinks to across channels
        if let Some(node) = sinks.get(0) {
            while !self.output_buffer.is_full() {
                graph.process(*node);
                // output is 64 samples long
                let outputs = &graph.graph.node_weight(*node).expect("").buffers;
                for output in outputs[0].iter() {
                    self.output_buffer.push(*output);
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
