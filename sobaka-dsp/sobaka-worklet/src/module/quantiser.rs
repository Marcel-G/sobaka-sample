use crate::{
    dsp::{
        quantiser::{dsp_quantiser, Quantiser as DSPQuantiser},
        shared::{Share, Shared},
    },
    fundsp_worklet::FundspWorklet,
};
use waw::{
    buffer::{AudioBuffer, ParamBuffer},
    worklet::{AudioModule, Emitter},
};

#[waw::derive::derive_command]
pub enum QuantiserCommand {
    UpdateNotes([bool; 12]),
}

pub struct Quantiser {
    handle: Shared<DSPQuantiser>,
    inner: FundspWorklet,
}

impl AudioModule for Quantiser {
    type Command = QuantiserCommand;

    fn create(_init: Option<Self::InitialState>, _emitter: Emitter<Self::Event>) -> Self {
        let init = [false; 12];
        let module = dsp_quantiser(init).share();

        let handle = module.clone();

        Quantiser {
            handle,
            inner: FundspWorklet::create(module),
        }
    }

    fn on_command(&mut self, command: Self::Command) {
        match command {
            QuantiserCommand::UpdateNotes(notes) => self.handle.lock().update_notes(notes),
        }
    }

    fn process(&mut self, audio: &mut AudioBuffer, params: &ParamBuffer<Self::Param>) {
        self.inner.process(audio, params);
    }
}

waw::main!(Quantiser);
