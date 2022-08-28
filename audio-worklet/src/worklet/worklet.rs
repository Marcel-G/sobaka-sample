use crate::dependent_module;
use std::sync::Arc;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsValue;
use wasm_bindgen_futures::JsFuture;
use web_sys::{AudioContext, AudioWorkletNodeOptions, MessagePort};

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
    pub fn pack(self) -> usize {
        Box::into_raw(Box::new(self)) as usize
    }
    pub fn unpack(val: usize) -> Self {
        unsafe { *Box::from_raw(val as *mut _) }
    }
}

impl Default for SobakaAudioWorkletProcessor {
    fn default() -> Self {
        Self::new()
    }
}

// constructs audio worklet options containing the wasm audio processor.
#[wasm_bindgen]
pub fn sobaka_options() -> AudioWorkletNodeOptions {
    let mut options = AudioWorkletNodeOptions::new();

    options.processor_options(Some(&js_sys::Array::of3(
        &wasm_bindgen::module(),
        &wasm_bindgen::memory(),
        &SobakaAudioWorkletProcessor::new().pack().into(),
    )));

    options
}

#[wasm_bindgen]
pub async fn prepare_sobaka_audio(ctx: AudioContext) -> Result<(), JsValue> {
    nop();
    let mod_url = dependent_module!(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/dist/src/worklet/sobaka.worklet.js"
    ))?;
    JsFuture::from(ctx.audio_worklet()?.add_module(&mod_url)?).await?;
    Ok(())
}

// TextEncoder and TextDecoder are not available in Audio Worklets, but there
// is a dirty workaround: Import polyfill.js to install stub implementations
// of these classes in globalThis.
#[wasm_bindgen(module = "/src/worklet/polyfill.js")]
extern "C" {
    fn nop();
}
