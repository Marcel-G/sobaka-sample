use crate::{
    dsp::{
        player::{dsp_player, PlayerEvent, Wave32Player},
        shared::{Share, Shared},
        trigger::reset_trigger, messaging::Emitter,
    },
    fundsp_worklet::FundspWorklet,
};
use fundsp::prelude::*;
use tsify::Tsify;
use wasm_worklet::{
    serde::{Deserialize, Serialize},
    types::{AudioModule, EventCallback},
};

#[derive(Serialize, Deserialize, Clone, Tsify)]
#[serde(crate = "wasm_worklet::serde")]
pub struct AudioData {
    pub data: Vec<f32>,
    pub sample_rate: f32,
}

wasm_worklet::derive_event! {
    pub enum SamplerEvent {
        /// Event when onsets have been detected
        OnDetect(Vec<f32>),
        /// Fired when a new segment is triggered
        OnTrigger(usize),
    }
}

wasm_worklet::derive_command! {
    pub enum SamplerCommand {
        /// Send new audio data
        UpdateData(AudioData),
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
            inner: FundspWorklet::create(module)
        }
    }

    fn on_command(&mut self, command: Self::Command) {
        match command {
            SamplerCommand::UpdateData(audio) => self.emitter
                .lock()
                .set_data(&audio.data, audio.sample_rate),
            SamplerCommand::SetThreshold(val) => self.emitter
                .lock()
                .set_threshold(val),
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

    fn process(
        &mut self,
        inputs: &[&[[f32; 128]]],
        outputs: &mut [&mut [[f32; 128]]],
        params: &wasm_worklet::types::ParamMap<Self::Param>,
    ) {
        self.inner.process(inputs, outputs, params);
    }
}

wasm_worklet::module!(Sampler);
