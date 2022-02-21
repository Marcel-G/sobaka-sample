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
// AudioProcessor is the rust entry-point for Web Audio AudioWorkletProcessor
#[wasm_bindgen]
pub struct AudioProcessor {
    graph: Arc<Mutex<AudioGraph>>,
    messenger: Messenger,
}

#[wasm_bindgen]
impl AudioProcessor {
    #[wasm_bindgen(constructor)]
    pub fn new(port: MessagePort, sample_rate: f64) -> Self {
        // Setup audio core
        let graph = Arc::new(Mutex::new(AudioGraph::new(sample_rate)));

        let messenger = connect(port, graph.clone());

        AudioProcessor { graph, messenger }
    }

    pub fn process(&mut self, input: &[f32], output_l: &mut [f32], output_r: &mut [f32]) {
        let mut graph = self.graph.lock().unwrap();
        let sinks = graph.sinks();
        let inputs = graph.inputs();

        if let Some(node) = sinks.get(0) {
            let mut out_index = 0;
            let mut in_index = 0;

            while out_index < output_l.len() {
                if let Some(node) = inputs.get(0) {
                    let input_node_data = graph.graph.node_weight_mut(*node).expect("");
                    for i in input_node_data.buffers[0].iter_mut() {
                        *i = *input.get(in_index).unwrap_or(&0.0);
                        in_index += 1;
                    }
                }
                graph.process(*node);
                // output is 64 samples long
                let output_node_data = &graph.graph.node_weight(*node).expect("").buffers[0];
                for sample in output_node_data.iter() {
                    output_l[out_index] = *sample;
                    output_r[out_index] = *sample;
                    out_index += 1;
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
