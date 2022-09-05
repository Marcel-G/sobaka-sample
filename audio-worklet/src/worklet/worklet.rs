use std::sync::Arc;
use wasm_bindgen::prelude::*;
use web_sys::MessagePort;

use fundsp::{hacker::AudioUnit32, MAX_BUFFER_SIZE};
use jsonrpc_pubsub::{PubSubHandler, Session};

use crate::{
    rpc::interface::SobakaGraphRpc, rpc::AudioProcessorRpc,
    utils::post_message_transport::PostMessageTransport, AudioProcessor,
};

#[wasm_bindgen]
pub struct SobakaAudioWorkletProcessor(Arc<AudioProcessor>);

#[wasm_bindgen]
impl SobakaAudioWorkletProcessor {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        SobakaAudioWorkletProcessor(Arc::new(AudioProcessor::new()))
    }

    pub fn init_messaging(&mut self, port: MessagePort) {
        let mut io = PubSubHandler::default();

        let rpc = AudioProcessorRpc::new(self.0.clone());

        io.extend_with(rpc.to_delegate());

        let transport = PostMessageTransport::new(io, port);

        transport.start(|sender| Arc::new(Session::new(sender)));
    }

    pub fn set_sample_rate(&mut self, sample_rate: f64) {
        self.0.set_sample_rate(sample_rate)
    }

    pub fn process(&mut self, input: &[f32], output_l: &mut [f32], output_r: &mut [f32]) {
        let mut graph = self.0.graph_mut().unwrap();
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

impl Default for SobakaAudioWorkletProcessor {
    fn default() -> Self {
        Self::new()
    }
}
