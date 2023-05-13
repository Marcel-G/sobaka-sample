use crate::{
    dsp::quantiser::{dsp_quantiser},
    fundsp_worklet::FundspWorklet,
};
use fundsp::setting::{listen, Sender};
use waw::{
    buffer::{AudioBuffer, ParamBuffer},
    worklet::{AudioModule, Emitter},
};

#[waw::derive::derive_command]
pub enum QuantiserCommand {
    UpdateNotes([bool; 12]),
}

pub struct Quantiser {
    inner: FundspWorklet,
    sender: Sender<[bool; 12]>,
}

impl AudioModule for Quantiser {
    type Command = QuantiserCommand;

    fn create(_init: Option<Self::InitialState>, _emitter: Emitter<Self::Event>) -> Self {
        let init = [false; 12];
        let (sender, module) = listen(dsp_quantiser(init));

        Quantiser {
            sender,
            inner: FundspWorklet::create(module, Default::default()),
        }
    }

    fn on_command(&mut self, command: Self::Command) {
        match command {
            QuantiserCommand::UpdateNotes(notes) => self.sender.try_send(notes).unwrap(),
        }
    }

    fn process(&mut self, audio: &mut AudioBuffer, params: &ParamBuffer<Self::Param>) {
        self.inner.process(audio, params);
    }
}

waw::main!(Quantiser);
