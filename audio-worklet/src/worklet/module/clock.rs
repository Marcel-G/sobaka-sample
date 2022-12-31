use fundsp::prelude::*;
use waw::{
    buffer::{AudioBuffer, ParamBuffer},
    worklet::AudioModule,
};

use crate::fundsp_worklet::FundspWorklet;

waw::derive_param! {
    pub enum ClockParams {
        #[param(
            automation_rate = "a-rate",
            min_value = 0.,
            max_value = 600.,
            default_value = 120.
        )]
        Bpm,
    }
}

pub struct Clock {
    inner: FundspWorklet,
}

impl AudioModule for Clock {
    type Param = ClockParams;

    const INPUTS: u32 = 0;
    const OUTPUTS: u32 = 5;

    fn create() -> Self {
        let module = {
            let clock_square = || sine() >> map(|f| if f[0] > 0.0 { 1.0 } else { -1.0 });

            let divide = [1.0, 2.0, 4.0, 8.0, 16.0];

            let clock_divider_node =
                branch::<U5, _, _, _>(|n| mul(divide[n as usize]) >> clock_square());

            let bpm = tag(ClockParams::Bpm as i64, 0.0) >> map(|f| bpm_hz(f[0]));

            bpm >> clock_divider_node
        };

        Clock {
            inner: FundspWorklet::create(module),
        }
    }

    fn process(&mut self, audio: &mut AudioBuffer, params: &ParamBuffer<Self::Param>) {
        self.inner.process(audio, params);
    }
}

waw::module!(Clock);
