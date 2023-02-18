use crate::{
    dsp::{self, shared::Share, stepped::SteppedEvent},
    fundsp_worklet::FundspWorklet,
};
use fundsp::prelude::*;
use waw::{
    buffer::{AudioBuffer, ParamBuffer},
    worklet::{AudioModule, Emitter},
};

#[waw::derive::derive_event]
pub enum SequencerEvent {
    /// StepChange is emitted whenever the step is changed
    StepChange(u32),
}

#[waw::derive::derive_command]
pub enum SequencerCommand {
    /// Update the value of a given step
    UpdateStep(u32, f64),
}

pub struct Sequencer {
    inner: FundspWorklet,
}

impl AudioModule for Sequencer {
    type Event = SequencerEvent;
    type Command = SequencerCommand;

    const INPUTS: u32 = 2;

    fn create(_init: Option<Self::InitialState>, emitter: Emitter<Self::Event>) -> Self {
        // @todo not initialised properly
        let steps = branch::<U8, _, _, _>(|i| tag(i, 0.0)).share();

        let handle_message = move |event| match event {
            SteppedEvent::StepChange(n) => emitter.send(SequencerEvent::StepChange(n as u32)),
        };

        let stepped =
            dsp::stepped::stepped::<U8, U1, _>(false, Some(Box::new(handle_message))).share();

        let module = {
            (pass() | // Gate input
                pass() | // Reset input
                steps)
                >> stepped
        };

        Sequencer {
            inner: FundspWorklet::create(module),
        }
    }

    fn on_command(&mut self, command: Self::Command) {
        match command {
            // @todo -- index 0 seems not to be working?
            SequencerCommand::UpdateStep(i, value) => self.inner.inner.set(i as i64, value),
        }
    }

    fn process(&mut self, audio: &mut AudioBuffer, params: &ParamBuffer<Self::Param>) {
        self.inner.process(audio, params);
    }
}

waw::main!(Sequencer);
