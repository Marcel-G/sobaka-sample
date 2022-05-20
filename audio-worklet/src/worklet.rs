use fundsp::{hacker::AudioUnit32};
use futures::channel::mpsc::UnboundedSender;
use jsonrpc_pubsub::{PubSubHandler, Session};
use std::sync::{Arc};
use wasm_bindgen::prelude::*;
use web_sys::MessagePort;

use crate::{
    rpc::AudioProcessorRpc,
    rpc::interface::SobakaGraphRpc,
    utils::post_message_transport::PostMessageTransport, AudioProcessor,
    SharedGraph,
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
        graph.process(
            64,
            &[&input[..64]],
            &mut [&mut output_l[..64], &mut output_r[..64]],
        );
        graph.process(
            64,
            &[&input[64..]],
            &mut [&mut output_l[64..], &mut output_r[64..]],
        );
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
