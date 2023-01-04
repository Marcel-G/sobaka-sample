use std::convert::TryInto;

use crate::{
    dsp::{self, shared::Share, stepped::SteppedEvent},
    fundsp_worklet::FundspWorklet,
};
use fundsp::prelude::*;
use waw::{
    buffer::{AudioBuffer, ParamBuffer},
    types::EventCallback,
    worklet::{AudioModule, Emitter},
};

#[waw::derive::derive_event]
pub enum StepSequencerEvent {
    /// StepChange is emitted whenever the step is changed
    StepChange(u32),
}
#[waw::derive::derive_command]
pub enum StepSequencerCommand {
    /// Update the value of a given step
    UpdateStep((u32, u32), bool),
}

pub struct StepSequencer {
    inner: FundspWorklet,
}

impl AudioModule for StepSequencer {
    type Event = StepSequencerEvent;
    type Command = StepSequencerCommand;

    const INPUTS: u32 = 2;
    const OUTPUTS: u32 = 4;

    fn create(emitter: Emitter<Self::Event>) -> Self {
        // @todo not initialised properly
        let steps =
            branch::<U4, _, _, _>(|x| branch::<U8, _, _, _>(|y| tag((x * 8) + y, 0.0))).share();

        let handle_message = move |event| match event {
            SteppedEvent::StepChange(n) => emitter.send(StepSequencerEvent::StepChange(n as u32)),
        };

        let stepped =
            dsp::stepped::stepped::<U8, U4, _>(true, Some(Box::new(handle_message))).share();

        let module = {
            (pass() | // Gate input
            pass() | // Reset input
            steps)
                >> stepped
        };

        StepSequencer {
            inner: FundspWorklet::create(module),
        }
    }

    fn on_command(&mut self, command: Self::Command) {
        match command {
            // @todo -- index 0 seems not to be working?
            StepSequencerCommand::UpdateStep((x, y), value) => self
                .inner
                .inner
                .set(((x * 8) + y) as i64, if value { 1.0 } else { 0.0 }),
        }
    }

    fn process(&mut self, audio: &mut AudioBuffer, params: &ParamBuffer<Self::Param>) {
        self.inner.process(audio, params);
    }
}

waw::main!(StepSequencer);
