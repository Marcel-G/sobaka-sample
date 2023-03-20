use crate::dsp::trigger::SchmittTrigger;
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
    /// Update the step values
    UpdateSteps([f32; 8]),
}

#[waw::derive::derive_initial_state]

pub struct SequencerState {
    pub steps: [f32; 8],
}

pub struct Sequencer {
    pub steps: [f32; 8],
    active: usize,
    clock_trigger: SchmittTrigger,
    reset_trigger: SchmittTrigger,
    emitter: Emitter<SequencerEvent>,
}

impl Sequencer {
    fn set_step(&mut self, step: usize, value: f32) {
        let step = self.steps.get_mut(step).unwrap();

        *step = value;
    }

    fn get_step(&self, step: usize) -> f32 {
        *self.steps.get(step).unwrap()
    }
}

impl AudioModule for Sequencer {
    type Event = SequencerEvent;
    type Command = SequencerCommand;
    type InitialState = SequencerState;

    const INPUTS: u32 = 2;

    fn create(init: Option<Self::InitialState>, emitter: Emitter<Self::Event>) -> Self {
        let steps = if let Some(state) = init {
            state.steps
        } else {
            [0.0; 8]
        };

        Sequencer {
            active: 0,
            steps,
            clock_trigger: Default::default(),
            reset_trigger: Default::default(),
            emitter,
        }
    }

    fn on_command(&mut self, command: Self::Command) {
        match command {
            SequencerCommand::UpdateSteps(steps) => {
                self.steps = steps
            }
        }
    }

    fn process(&mut self, audio: &mut AudioBuffer, _params: &ParamBuffer<Self::Param>) {
        let (inputs, outputs) = audio.split();
        let trigger_buffer = inputs.get(0).and_then(|i| i.channel(0)); // mono CV input
        let reset_buffer = inputs.get(1).and_then(|i| i.channel(0)); // mono CV input

        let mut output_buffer = outputs.get_mut(0).and_then(|i| i.channel_mut(0)); // single mono output

        for i in 0..128 {
            if let Some(val) = reset_buffer.and_then(|t| t.get(i)) {
                if self.reset_trigger.tick(*val, 0.0, 0.001) == Some(true) {
                    // Reset the step to zero
                    self.active = 0;
                    // Emit event to notify the UI
                    self.emitter
                        .send(SequencerEvent::StepChange(self.active as u32))
                }
            }

            if let Some(val) = trigger_buffer.and_then(|t| t.get(i)) {
                if self.clock_trigger.tick(*val, 0.0, 0.001) == Some(true) {
                    // Advance the step on a rising trigger input
                    self.active = (self.active + 1) % 8;
                    // Emit event to notify the UI
                    self.emitter
                        .send(SequencerEvent::StepChange(self.active as u32))
                }

                if let Some(output) = output_buffer.as_mut().and_then(|o| o.get_mut(i)) {
                    *output = self.get_step(self.active)
                }
            }
        }
    }
}

waw::main!(Sequencer);
