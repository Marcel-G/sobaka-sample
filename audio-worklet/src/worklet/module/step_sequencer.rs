use std::convert::TryInto;

use crate::{
    dsp::{messaging::Emitter, shared::Share, stepped::SteppedEvent, self},
    fundsp_worklet::FundspWorklet,
};
use fundsp::prelude::*;
use wasm_worklet::types::{AudioModule, EventCallback, ParamMap};

wasm_worklet::derive_event! {
    pub enum StepSequencerEvent {
        /// StepChange is emitted whenever the step is changed
        StepChange(u32),
    }
}

wasm_worklet::derive_command! {
    pub enum StepSequencerCommand {
        /// Update the value of a given step
        UpdateStep((u32, u32), bool),
    }
}

pub struct StepSequencer {
    emitter: Box<dyn Emitter<Event = SteppedEvent>>,
    inner: FundspWorklet,
}

impl AudioModule for StepSequencer {
    type Event = StepSequencerEvent;
    type Command = StepSequencerCommand;

    const INPUTS: u32 = 2;
    const OUTPUTS: u32 = 4;

    fn create() -> Self {
        // @todo not initialised properly
        let steps = branch::<U4, _, _, _>(|x| {
            branch::<U8, _, _, _>(|y| {
                tag((x * 8) + y, 0.0)
            })
        })
        .share();

        let stepped = dsp::stepped::stepped::<U8, U4, _>(true).share();

        let emitter = stepped.clone();

        let module = {
            (pass() | // Gate input
            pass() | // Reset input
            steps)
            >> stepped
        };

        StepSequencer {
            emitter: Box::new(emitter),
            inner: FundspWorklet::create(module),
        }
    }

    fn on_command(&mut self, command: Self::Command) {
        match command {
            // @todo -- index 0 seems not to be working?
            StepSequencerCommand::UpdateStep((x, y), value) => self.inner.inner.set(
                ((x * 8) + y) as i64,
                if value { 1.0 } else { 0.0 }
            ),
        }
    }

    // @todo -- this is kinda messy
    fn add_event_listener_with_callback(&mut self, callback: EventCallback<Self>) {
        self.emitter
            .add_event_listener_with_callback(Box::new(move |event| {
                let e = match event {
                    SteppedEvent::StepChange(i) => StepSequencerEvent::StepChange(i.try_into().unwrap()),
                };
                (callback)(e);
            }))
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

wasm_worklet::module!(StepSequencer);