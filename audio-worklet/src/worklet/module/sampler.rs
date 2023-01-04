use crate::{
    dsp::{
        player::{dsp_player, Wave32Player},
        shared::{Share, Shared},
        trigger::reset_trigger, onset::{Spectrogram, superflux_diff_spec},
    },
    fundsp_worklet::FundspWorklet,
};
use fundsp::prelude::*;
use tsify::{self, Tsify};
use wasm_bindgen::{convert::FromWasmAbi, describe::WasmDescribe};
use waw::{
    buffer::{AudioBuffer, ParamBuffer},
    serde::{Deserialize, Serialize},
    worklet::{AudioModule, Emitter},
};

// The audio data needs to be transferred as bytes and converted as
// its about 10x faster
#[derive(Clone, Serialize, Deserialize, Tsify)]
#[serde(crate = "waw::serde")]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct  AudioDataTransport {
    #[tsify(type = "ArrayBuffer")]
    #[serde(with = "serde_bytes")]
    bytes: Vec<u8>,
    sample_rate: f32
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
            sample_rate: value.sample_rate
        }
    }
}

#[waw::derive::derive_event]
pub enum SamplerEvent {
    /// Event when onsets have been detected
    OnDetect(Vec<f32>),
    /// Fired when a new segment is triggered
    OnTrigger(usize),
}

#[waw::derive::derive_command]
pub enum SamplerCommand {
    /// Send new audio data
    UpdateData(AudioDataTransport),
    SetThreshold(f32),
}


pub struct Sampler {
    player: Shared<Wave32Player<f32>>,
    inner: FundspWorklet,
}

impl AudioModule for Sampler {
    type Event = SamplerEvent;
    type Command = SamplerCommand;

    fn create(emitter: Emitter<Self::Event>) -> Self {
        let player = dsp_player(0, None, 0.0).share();

        let shared_player = player.clone();

        let module = reset_trigger(player) >> declick::<f32, f32>();

        Sampler {
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
                    .set_data(&audio_data.data, audio_data.sample_rate)
            },
            SamplerCommand::SetThreshold(val) => self.player.lock().set_threshold(val),
        }
    }

    fn process(&mut self, audio: &mut AudioBuffer, params: &ParamBuffer<Self::Param>) {
        self.inner.process(audio, params);
    }
}

waw::main!(Sampler);

#[wasm_bindgen(js_class = "Sampler")]
impl SamplerNode {
    pub async fn update_audio(&mut self, data: AudioDataTransport) {
        self.command(SamplerCommand::UpdateData(data.clone()));

        let audio_data: AudioData = data.into();

        let fps = 200;
        let mut spectrogram = Spectrogram::new(audio_data.sample_rate, 2048, fps, 24);

        let spec = spectrogram.process(&audio_data.data).await;

        let diff_spec = Some(superflux_diff_spec(spec, 1, 3));
    }

    // fn detect_peaks(&mut self) {
    //     // @todo this needs cleanup
    //     let fps = 200;
    //     if let Some(diff_spec) = &self.diff_spec {
    //         let detections = onset(self.threshold, diff_spec, fps);

    //         // Send detections as sample indexs
    //         self.detections = detections
    //             .iter()
    //             .map(|d| (d * self.wave.sample_rate() as f32) as usize)
    //             .collect::<Vec<_>>();

    //         let length_seconds = self.wave.len() as f32 / self.wave.sample_rate() as f32;

    //         // Send detections as seconds
    //         self.notify(PlayerEvent::OnDetect(
    //             detections
    //                 .iter()
    //                 .map(|d| d / length_seconds)
    //                 .collect::<Vec<_>>(),
    //         ));
    //     }
    // }
}
