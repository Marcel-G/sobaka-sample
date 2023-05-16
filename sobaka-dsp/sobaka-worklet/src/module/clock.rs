use crate::fundsp_worklet::FundspWorklet;
use fundsp::prelude::*;
use waw::{
    buffer::{AudioBuffer, ParamBuffer},
    worklet::{AudioModule, Emitter},
};

#[waw::derive::derive_param]
pub enum ClockParams {
    #[param(
        automation_rate = "a-rate",
        min_value = 0.,
        max_value = 600.,
        default_value = 120.
    )]
    Bpm,
}

pub struct Clock {
    inner: FundspWorklet<ClockParams>,
}

pub fn sine_with_phase<T: Real>(phase: T) -> An<Sine<T>> {
    An(Sine::with_phase(DEFAULT_SR, Some(phase)))
}

impl AudioModule for Clock {
    type Param = ClockParams;

    const INPUTS: u32 = 0;
    const OUTPUTS: u32 = 5;

    fn create(_init: Option<Self::InitialState>, _emitter: Emitter<Self::Event>) -> Self {
        let param_storage = FundspWorklet::create_param_storage();

        let module = {
            // Using the same initial phase so oscillators are in sync.
            // otherwise fundsp applies pseudo-random phase to each oscillator.
            let clock_square =
                || sine_with_phase(0.0) >> map(|f| if f[0] > 0.0 { 1.0 } else { -1.0 });

            let divide = [1.0, 2.0, 4.0, 8.0, 16.0];

            let clock_divider_node =
                branch::<U5, _, _, _>(|n| mul(divide[n as usize]) >> clock_square());

            let bpm = var(&param_storage[ClockParams::Bpm]) >> map(|f| bpm_hz(f[0]));

            bpm >> clock_divider_node
        };

        Clock {
            inner: FundspWorklet::create(module, param_storage),
        }
    }

    fn process(&mut self, audio: &mut AudioBuffer, params: &ParamBuffer<Self::Param>) {
        self.inner.process(audio, params);
    }
}

waw::main!(Clock);
