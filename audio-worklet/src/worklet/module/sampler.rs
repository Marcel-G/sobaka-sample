use crate::{
    dsp::{
        messaging::Emitter,
        player::{dsp_player, PlayerEvent, Wave32Player},
        shared::{Share, Shared},
        trigger::reset_trigger,
    },
    fundsp_worklet::FundspWorklet,
};
use fundsp::prelude::*;
use tsify::Tsify;
use waw::{
    buffer::{AudioBuffer, ParamBuffer},
    serde::{Deserialize, Serialize},
    types::EventCallback,
    worklet::AudioModule,
};

#[derive(Serialize, Deserialize, Clone, Tsify)]
#[serde(crate = "waw::serde")]
pub struct AudioData {
    pub data: Vec<f32>,
    pub sample_rate: f32,
}

waw::derive_event! {
    pub enum SamplerEvent {
        /// Event when onsets have been detected
        OnDetect(Vec<f32>),
        /// Fired when a new segment is triggered
        OnTrigger(usize),
    }
}

waw::derive_command! {
    pub enum SamplerCommand {
        /// Send new audio data
        // UpdateData(js_sys::Float32Array),
        SetThreshold(f32),
    }
}

pub struct Sampler {
    emitter: Shared<Wave32Player<f32>>,
    inner: FundspWorklet,
}

impl AudioModule for Sampler {
    type Event = SamplerEvent;
    type Command = SamplerCommand;

    fn create() -> Self {
        let player = dsp_player(0, None, 0.0).share();

        let emitter = player.clone();

        let module = reset_trigger(player) >> declick::<f32, f32>();

        Sampler {
            emitter,
            inner: FundspWorklet::create(module),
        }
    }

    fn on_command(&mut self, command: Self::Command) {
        match command {
            // SamplerCommand::UpdateData(audio) => self.emitter
            //     .lock()
            //     .set_data(&audio.data, audio.sample_rate),
            SamplerCommand::SetThreshold(val) => self.emitter.lock().set_threshold(val),
        }
    }

    fn add_event_listener_with_callback(&mut self, callback: EventCallback<Self>) {
        self.emitter
            .add_event_listener_with_callback(Box::new(move |event| {
                let e = match event {
                    PlayerEvent::OnDetect(points) => SamplerEvent::OnDetect(points),
                    PlayerEvent::OnTrigger(index) => SamplerEvent::OnTrigger(index),
                };
                (callback)(e);
            }))
    }

    fn process(&mut self, audio: &mut AudioBuffer, params: &ParamBuffer<Self::Param>) {
        self.inner.process(audio, params);
    }
}

waw::module!(Sampler);
