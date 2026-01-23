use fundsp::prelude::*;
use std::f32::consts::TAU;
use wasm_bindgen::{prelude::wasm_bindgen, JsValue};
use waw::{register, AutomationRate, ParameterDescriptor, ParameterValuesRef, Processor};

use crate::debug;

const ZERO_BUFFER: [f32; 128] = [0.0; 128];
const RESET_THRESHOLD: f32 = 0.5;

/// Resettable sine LFO oscillator.
/// Resets phase to zero on rising edge of reset input.
#[derive(Clone)]
pub struct ResettableSineLfo {
    phase: f32,
    sample_rate: f32,
    prev_reset: f32,
}

impl ResettableSineLfo {
    pub fn new() -> Self {
        Self {
            phase: 0.0,
            sample_rate: 44100.0,
            prev_reset: 0.0,
        }
    }
}

impl AudioNode for ResettableSineLfo {
    const ID: u64 = 1001;
    type Inputs = U2;  // Input 0: frequency (Hz), Input 1: reset trigger
    type Outputs = U1; // Output 0: sine wave [-1, 1]

    fn reset(&mut self) {
        self.phase = 0.0;
        self.prev_reset = 0.0;
    }

    fn set_sample_rate(&mut self, sample_rate: f64) {
        self.sample_rate = sample_rate as f32;
    }

    #[inline]
    fn tick(&mut self, input: &Frame<f32, Self::Inputs>) -> Frame<f32, Self::Outputs> {
        let freq = input[0];
        let reset = input[1];

        // Detect rising edge on reset input
        if reset > RESET_THRESHOLD && self.prev_reset <= RESET_THRESHOLD {
            self.phase = 0.0;
        }
        self.prev_reset = reset;

        // Generate sine wave
        let output = (self.phase * TAU).sin();

        // Advance phase
        self.phase += freq / self.sample_rate;
        // Wrap phase to [0, 1) to prevent floating point issues
        self.phase = self.phase.fract();
        if self.phase < 0.0 {
            self.phase += 1.0;
        }

        [output].into()
    }

    fn route(&mut self, input: &SignalFrame, _frequency: f64) -> SignalFrame {
        // Output depends on input
        Routing::Generator(0.0).route(input, self.outputs())
    }
}

pub struct LfoProcessor {
    lfo: ResettableSineLfo,
    sample_rate: f32,
}

impl Processor for LfoProcessor {
    type Data = ();

    fn new(_data: Self::Data) -> Self {
        Self {
            lfo: ResettableSineLfo::new(),
            sample_rate: 44100.0,
        }
    }

    fn process(
        &mut self,
        inputs: &[&[f32]],
        outputs: &mut [&mut [f32]],
        sample_rate: f32,
        params: &ParameterValuesRef,
    ) {
        if self.sample_rate != sample_rate {
            self.sample_rate = sample_rate;
            self.lfo.set_sample_rate(sample_rate as f64);
        }

        // Rate is in Hz (0.01 to 30 Hz for LFO range)
        let rate = params.get("rate").unwrap_or(&ZERO_BUFFER);
        
        // Reset input from audio input 0
        let zero_slice = ZERO_BUFFER.as_slice();
        let reset_input = inputs.get(0).unwrap_or(&zero_slice);

        let output = outputs.get_mut(0);
        if let Some(out) = output {
            for i in 0..128 {
                let freq = rate.get(i).copied().unwrap_or(1.0);
                let reset = reset_input.get(i).copied().unwrap_or(0.0);
                let frame = self.lfo.tick(&[freq, reset].into());
                out[i] = frame[0];
            }
        }

        debug::log_buffer_stats("LFO", outputs);
    }

    fn parameter_descriptors() -> Vec<ParameterDescriptor> {
        vec![ParameterDescriptor {
            name: "rate".to_string(),
            default_value: 1.0,
            min_value: 0.01,
            max_value: 30.0,
            automation_rate: AutomationRate::KRate,
        }]
    }
}

#[wasm_bindgen]
pub struct LfoNode {
    wrapper: waw::AudioWorkletNodeWrapper,
}

#[wasm_bindgen]
impl LfoNode {
    #[wasm_bindgen(constructor)]
    pub fn new(ctx: &web_sys::AudioContext) -> Result<LfoNode, JsValue> {
        let options = web_sys::AudioWorkletNodeOptions::new();
        options.set_channel_count(1);
        options.set_number_of_inputs(1);  // 1 input for reset signal
        options.set_number_of_outputs(1);

        let wrapper = LfoProcessor::create_node(ctx, (), Some(&options))?;
        Ok(LfoNode { wrapper })
    }

    #[wasm_bindgen(getter)]
    pub fn node(&self) -> web_sys::AudioWorkletNode {
        self.wrapper.node().clone()
    }
}

register!(LfoProcessor, "lfo");
