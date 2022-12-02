use crate::{
    dsp::{quantiser::{Quantiser as DSPQuantiser, dsp_quantiser}, shared::{Share, Shared}}, fundsp_worklet::FundspWorklet,
};
use wasm_worklet::{types::{AudioModule, ParamMap}, derive_command};

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
            QuantiserCommand::UpdateNotes(notes) => {
                self.handle.lock().update_notes(notes)
            },
        }
    }

    fn process(
        &mut self,
        inputs: &[&[[f32; 128]]],
        outputs: &mut [&mut [[f32; 128]]],
        params: &ParamMap<Self::Param>,
    ) {
        self.inner.process(inputs, outputs, params);
    }
}

wasm_worklet::module!(Quantiser);
