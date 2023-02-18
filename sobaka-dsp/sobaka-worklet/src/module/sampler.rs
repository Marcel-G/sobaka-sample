use crate::{
    dsp::{
        onset::{onset, superflux_diff_spec, Spectrogram},
        player::{dsp_player, PlayerEvent, Wave32Player},
        shared::{Share, Shared},
        trigger::reset_trigger,
    },
    fundsp_worklet::FundspWorklet,
};
use fundsp::prelude::*;
use tsify::{self, Tsify};
use waw::{
    buffer::{AudioBuffer, ParamBuffer},
    serde::{Deserialize, Serialize},
    utils::callback::Callback,
    web_sys::{AudioContext, AudioParam, AudioWorkletNode},
    worklet::{AudioModule, Emitter},
};

// The audio data is transferred as bytes using `Float32Array.buffer` and converted
// back to Vec<f32> on the Rust side. This is 100x faster than Serializing / Deserializing Vec<f32> data.
#[derive(Clone, Serialize, Deserialize, Tsify)]
#[serde(crate = "waw::serde")]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct AudioDataTransport {
    #[tsify(type = "ArrayBuffer")]
    #[serde(with = "serde_bytes")]
    bytes: Vec<u8>,
    sample_rate: f32,
}

pub struct AudioData {
    pub data: Vec<f32>,
    pub sample_rate: f32,
}

impl From<AudioDataTransport> for AudioData {
    fn from(value: AudioDataTransport) -> Self {
        let data: Vec<f32> = bytemuck::cast_slice(&value.bytes).to_vec();

        Self {
            data,
            sample_rate: value.sample_rate,
        }
    }
}

#[waw::derive::derive_event]
#[derive(Clone)]
pub enum SamplerEvent {
    /// Detections are sent back to update the UI (see `SamplerCommand::OnDetect`)
    OnDetect(Vec<u32>),
    /// Fired when a new segment is triggered
    OnTrigger(u32),
}

#[waw::derive::derive_command]
pub enum SamplerCommand {
    /// Send new audio data
    UpdateData(AudioDataTransport),
    /// Fired when detections have been recalculated on the main thread
    OnDetect(Vec<u32>),
}

pub struct Sampler {
    emitter: Emitter<SamplerEvent>,
    player: Shared<Wave32Player<f32>>,
    inner: FundspWorklet,
}

impl AudioModule for Sampler {
    type Event = SamplerEvent;
    type Command = SamplerCommand;

    fn create(_init: Option<Self::InitialState>, emitter: Emitter<Self::Event>) -> Self {
        let play_emitter = emitter.clone();
        let handle_message = move |event| match event {
            PlayerEvent::OnTrigger(index) => {
                play_emitter.send(SamplerEvent::OnTrigger(index as u32))
            }
        };

        let player = dsp_player(0, Some(Box::new(handle_message))).share();

        let shared_player = player.clone();

        let module = reset_trigger(player) >> declick::<f32, f32>();

        Sampler {
            emitter,
            player: shared_player,
            inner: FundspWorklet::create(module),
        }
    }

    fn on_command(&mut self, command: Self::Command) {
        match command {
            SamplerCommand::UpdateData(audio) => {
                let audio_data: AudioData = audio.into();

                self.player
                    .lock()
                    .set_data(&audio_data.data, audio_data.sample_rate);
            }
            SamplerCommand::OnDetect(detections) => {
                self.player.lock().set_detections(&detections);
                // Send detections back to the main thread. @todo - this is a bit roundabout
                self.emitter.send(SamplerEvent::OnDetect(detections));
            }
        }
    }

    fn process(&mut self, audio: &mut AudioBuffer, params: &ParamBuffer<Self::Param>) {
        self.inner.process(audio, params);
    }
}

waw::main!(Sampler);

// Wrap the `SamplerNode` in a controller. This executes onset detection on the main thread
// when audio data is updated.
#[wasm_bindgen]
pub struct SamplerController {
    node: SamplerNode,
    audio: Option<AudioData>,
    diff_spec: Option<Vec<f32>>,
    threshold: f32,
}

const FPS: usize = 200;

#[wasm_bindgen]
impl SamplerController {
    pub async fn update_audio(&mut self, data: AudioDataTransport) {
        self.node.command(SamplerCommand::UpdateData(data.clone()));

        let audio_data: AudioData = data.into();
        let mut spectrogram = Spectrogram::new(audio_data.sample_rate, 2048, FPS, 24);

        // @todo - Find a sensible way to do processing incrementally, as to not block the main thread.
        let spec = spectrogram.process(&audio_data.data);

        self.diff_spec = Some(superflux_diff_spec(spec, 1, 3));

        self.audio = Some(audio_data);
        self.detect_peaks();
    }

    pub fn set_threshold(&mut self, threshold: f32) {
        self.threshold = threshold;
        self.detect_peaks();
    }

    fn detect_peaks(&mut self) {
        if let (Some(diff_spec), Some(audio)) = (&self.diff_spec, &self.audio) {
            let detections = onset(self.threshold, diff_spec, FPS);

            // Send detections as sample indexes
            self.command(SamplerCommand::OnDetect(
                detections
                    .iter()
                    .map(|d| (d * audio.sample_rate) as u32)
                    .collect::<Vec<_>>(),
            ))
        }
    }
}

// Forward the node interface onto the controller
// @todo - maybe this should be a trait + Derive macro?
#[wasm_bindgen]
impl SamplerController {
    pub async fn create(ctx: AudioContext) -> Result<SamplerController, JsValue> {
        let node = SamplerNode::create(ctx, None).await.unwrap();

        Ok(SamplerController {
            node,
            diff_spec: None,
            audio: None,
            threshold: 0.5,
        })
    }
    pub fn command(&self, message: <Sampler as AudioModule>::Command) {
        self.node.command(message)
    }
    pub fn node(&self) -> Result<AudioWorkletNode, JsValue> {
        self.node.node()
    }
    pub fn subscribe(&mut self, callback: Callback<<Sampler as AudioModule>::Event>) {
        self.node.subscribe(callback)
    }
    pub fn get_param(&self, param: <Sampler as AudioModule>::Param) -> AudioParam {
        self.node.get_param(param)
    }
    pub fn destroy(&mut self) {
        self.node.destroy()
    }
}
