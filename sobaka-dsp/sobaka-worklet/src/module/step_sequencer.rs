use crate::dsp::trigger::SchmittTrigger;
use waw::{
    buffer::{AudioBuffer, ParamBuffer},
    web_sys::console,
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

#[waw::derive::derive_initial_state]

pub struct StepSequencerState {
    pub steps: [[bool; 8]; 4],
}

pub struct StepSequencer {
    steps: [[bool; 8]; 4],
    active: usize,
    clock_trigger: SchmittTrigger,
    reset_trigger: SchmittTrigger,
    emitter: Emitter<StepSequencerEvent>,
}

impl StepSequencer {
    fn set_step(&mut self, channel: usize, step: usize, value: bool) {
        let step = self
            .steps
            .get_mut(channel)
            .and_then(|r| r.get_mut(step))
            .unwrap();

        *step = value;
    }

    fn get_step(&self, channel: usize, step: usize) -> bool {
        *self.steps.get(channel).and_then(|s| s.get(step)).unwrap()
    }
}

impl AudioModule for StepSequencer {
    type Event = StepSequencerEvent;
    type Command = StepSequencerCommand;
    type InitialState = StepSequencerState;

    const INPUTS: u32 = 2;
    const OUTPUTS: u32 = 4;

    fn create(init: Option<Self::InitialState>, emitter: Emitter<Self::Event>) -> Self {
        let steps = if let Some(state) = init {
            state.steps
        } else {
            [[false; 8]; 4]
        };

        StepSequencer {
            active: 0,
            steps,
            clock_trigger: Default::default(),
            reset_trigger: Default::default(),
            emitter,
        }
    }

    fn on_command(&mut self, command: Self::Command) {
        match command {
            StepSequencerCommand::UpdateStep((x, y), value) => {
                self.set_step(x as usize, y as usize, value)
            }
        }
    }

    fn process(&mut self, audio: &mut AudioBuffer, _params: &ParamBuffer<Self::Param>) {
        let (inputs, outputs) = audio.split();
        let trigger_buffer = inputs.get(0).and_then(|i| i.channel(0)); // mono CV input
        let reset_buffer = inputs.get(1).and_then(|i| i.channel(0)); // mono CV input

        let mut output_buffers = outputs
            .iter_mut()
            .map(|i| i.channel_mut(0))
            .collect::<Vec<_>>(); // mono CV outputs

        for i in 0..128 {
            if let Some(val) = reset_buffer.and_then(|t| t.get(i)) {
                if self.reset_trigger.tick(*val, 0.0, 0.001) == Some(true) {
                    // Reset the step to zero
                    self.active = 0;
                    // Emit event to notify the UI
                    self.emitter
                        .send(StepSequencerEvent::StepChange(self.active as u32))
                }
            }

            if let Some(val) = trigger_buffer.and_then(|t| t.get(i)) {
                if self.clock_trigger.tick(*val, 0.0, 0.001) == Some(true) {
                    // Advance the step on a rising trigger input
                    self.active = (self.active + 1) % 8;
                    // Emit event to notify the UI
                    self.emitter
                        .send(StepSequencerEvent::StepChange(self.active as u32))
                }

                for (channel, output_buffer) in output_buffers.iter_mut().enumerate() {
                    if let Some(output) = output_buffer.as_mut().and_then(|o| o.get_mut(i)) {
                        *output = if self.get_step(channel, self.active) {
                            *val
                        } else {
                            0.0
                        }
                    }
                }
            }
        }
    }
}

waw::main!(StepSequencer);
