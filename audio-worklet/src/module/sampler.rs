use crate::{
    context::ModuleContext,
    dsp::{messaging::MessageHandler, shared::Share, player::{player, PlayerEvent}, trigger::reset_trigger}, utils::observer::Observable,
};
use fundsp::prelude::*;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Default, Serialize, Deserialize, TS, Clone)]
#[ts(export)]
pub struct AudioData {
    pub data: Vec<f32>,
    pub sample_rate: f32,
}

#[derive(Default, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct SamplerParams {
    pub audio_data: Option<AudioData>
}

/// Incoming commands into the sampler module.
#[derive(Serialize, Deserialize, TS, Clone)]
#[ts(export)]
pub enum SamplerCommand {
    /// Send new audio data
    UpdateData(AudioData),
}

/// Incoming commands into the sampler module.
#[derive(Serialize, Deserialize, TS, Clone)]
#[ts(export)]
pub enum SamplerEvent {
    /// Event when onsets have been detected
    OnDetect(Vec<f32>),
}


pub fn sampler(
    params: &SamplerParams,
    context: &mut ModuleContext<SamplerCommand, SamplerEvent>,
) -> impl AudioUnit32 {
    let mut player = player(0, None);
    if let Some(audio_data) = &params.audio_data {
        player.set_data(&audio_data.data, audio_data.sample_rate);
    }

    let module = player.share();

    context.set_tx(
      module
            .clone()
            .message_handler(|unit, command: SamplerCommand| match command {
                SamplerCommand::UpdateData(audio_data) => {
                  unit.set_data(&audio_data.data, audio_data.sample_rate);
                },
            }),
    );

    context.set_rx(module.clone().map(|event| match event {
        PlayerEvent::OnDetect(step) => SamplerEvent::OnDetect(step),
    }));

    reset_trigger(module)
}
