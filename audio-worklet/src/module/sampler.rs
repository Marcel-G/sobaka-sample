use crate::{
    context::ModuleContext,
    dsp::{messaging::MessageHandler, shared::Share, player::player, trigger::reset_trigger},
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


pub fn sampler(
    params: &SamplerParams,
    context: &mut ModuleContext<SamplerCommand>,
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

    reset_trigger(module)
}
