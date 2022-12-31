use std::convert::TryInto;

use crate::{
    dsp::{self, messaging::Emitter, shared::Share, stepped::SteppedEvent},
    fundsp_worklet::FundspWorklet,
};
use fundsp::prelude::*;
use waw::{
    buffer::{AudioBuffer, ParamBuffer},
    types::EventCallback,
    worklet::AudioModule,
};

waw::derive_event! {
    pub enum SequencerEvent {
        /// StepChange is emitted whenever the step is changed
        StepChange(u32),
    }
}

waw::derive_command! {
    pub enum SequencerCommand {
        /// Update the value of a given step
        UpdateStep(u32, f64),
    }
}

pub struct Sequencer {
    emitter: Box<dyn Emitter<Event = SteppedEvent>>,
    inner: FundspWorklet,
}

impl AudioModule for Sequencer {
    type Event = SequencerEvent;
    type Command = SequencerCommand;

    const INPUTS: u32 = 2;

    fn create() -> Self {
        // @todo not initialised properly
        let steps = branch::<U8, _, _, _>(|i| tag(i, 0.0)).share();

        let stepped = dsp::stepped::stepped::<U8, U1, _>(false).share();

        let emitter = stepped.clone();

        let module = {
            (pass() | // Gate input
                pass() | // Reset input
                steps)
                >> stepped
        };

        Sequencer {
            emitter: Box::new(emitter),
            inner: FundspWorklet::create(module),
        }
    }

    fn on_command(&mut self, command: Self::Command) {
        match command {
            // @todo -- index 0 seems not to be working?
            SequencerCommand::UpdateStep(i, value) => self.inner.inner.set(i as i64, value),
        }
    }

    // @todo -- this is kinda messy
    fn add_event_listener_with_callback(&mut self, callback: EventCallback<Self>) {
        self.emitter
            .add_event_listener_with_callback(Box::new(move |event| {
                let e = match event {
                    SteppedEvent::StepChange(i) => {
                        SequencerEvent::StepChange(i.try_into().unwrap())
                    }
                };
                (callback)(e);
            }))
    }

    fn process(&mut self, audio: &mut AudioBuffer, params: &ParamBuffer<Self::Param>) {
        self.inner.process(audio, params);
    }
}

waw::module!(Sequencer);
