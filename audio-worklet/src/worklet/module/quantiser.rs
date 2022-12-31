use crate::{
    dsp::{
        quantiser::{dsp_quantiser, Quantiser as DSPQuantiser},
        shared::{Share, Shared},
    },
    fundsp_worklet::FundspWorklet,
};
use waw::{
    buffer::{AudioBuffer, ParamBuffer},
    derive_command,
    worklet::AudioModule,
};

derive_command! {
    pub enum QuantiserCommand {
        UpdateNotes([bool; 12]),
    }
}

pub struct Quantiser {
    handle: Shared<DSPQuantiser>,
    inner: FundspWorklet,
}

impl AudioModule for Quantiser {
    type Command = QuantiserCommand;

    fn create() -> Self {
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

waw::module!(Quantiser);
