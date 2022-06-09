#![allow(clippy::unused_unit)]
use fundsp::{hacker::AudioUnit32, MAX_BUFFER_SIZE};
use futures::channel::mpsc::UnboundedSender;
use jsonrpc_pubsub::{PubSubHandler, Session};
use std::sync::Arc;
use wasm_bindgen::prelude::*;
use web_sys::MessagePort;

use crate::{
    rpc::interface::SobakaGraphRpc, rpc::AudioProcessorRpc,
    utils::post_message_transport::PostMessageTransport, AudioProcessor, SharedGraph,
};
// AudioProcessor is the rust entry-point for Web Audio AudioWorkletProcessor
#[wasm_bindgen]
pub struct SobakaAudioWorklet {
    graph: SharedGraph,
}

#[wasm_bindgen]
impl SobakaAudioWorklet {
    #[wasm_bindgen(constructor)]
    pub fn new(port: MessagePort, sample_rate: f64) -> Self {
        let processor = AudioProcessor::new(sample_rate);

        let worklet = SobakaAudioWorklet {
            graph: processor.graph(),
        };

        let mut io = PubSubHandler::default();

        let rpc = AudioProcessorRpc::new(processor);

        io.extend_with(rpc.to_delegate());

        // Metadata should be created on connection
        // No connection is made in this case
        // unsure how futures work so this may be broken
        let metadata_extractor =
            |sender: &UnboundedSender<String>| Arc::new(Session::new(sender.clone()));

        PostMessageTransport::connect(io, metadata_extractor, port);

        worklet
    }

    pub fn process(&mut self, input: &[f32], output_l: &mut [f32], output_r: &mut [f32]) {
        let mut graph = self.graph.lock().expect("Cannot lock graph");
        // When no input is provided
        if input.is_empty() {
            for (l, r) in output_l
                .chunks_mut(MAX_BUFFER_SIZE)
                .zip(output_r.chunks_mut(MAX_BUFFER_SIZE))
            {
                graph.process(MAX_BUFFER_SIZE, &[], &mut [l, r]);
            }
        } else {
            // When input is provided
            for ((l, r), i) in output_l
                .chunks_mut(MAX_BUFFER_SIZE)
                .zip(output_r.chunks_mut(MAX_BUFFER_SIZE))
                .zip(input.chunks(MAX_BUFFER_SIZE))
            {
                graph.process(MAX_BUFFER_SIZE, &[i], &mut [l, r]);
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
