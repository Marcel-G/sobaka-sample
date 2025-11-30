use fundsp::prelude::*;
use wasm_bindgen::{prelude::wasm_bindgen, JsValue};
use waw::{register, AutomationRate, ParameterDescriptor, ParameterValuesRef, Processor};

pub struct ClockDividerProcessor {
    inner: BigBlockAdapter,
    bpm: Shared,
}

impl Processor for ClockDividerProcessor {
    type Data = ();

    fn new(_data: Self::Data) -> Self {
        let bpm = shared(1.0);

        let module = {
            // Using the same initial phase so oscillators are in sync.
            // otherwise fundsp applies pseudo-random phase to each oscillator.
            let clock_square =
                || An(Sine::<f32>::with_phase(0.0)) >> map(|f| if f[0] > 0.0 { 1.0 } else { -1.0 });

            let divide = [1.0, 2.0, 4.0, 8.0, 16.0];

            let clock_divider_node =
                branchi::<U4, _, _>(|n| mul(divide[n as usize]) >> clock_square());

            let bpm = var(&bpm) >> map(|f| bpm_hz(f[0]));

            bpm >> clock_divider_node
        };

        Self {
            inner: BigBlockAdapter::new(Box::new(module)),
            bpm: bpm,
        }
    }

    fn process(
        &mut self,
        inputs: &[&[f32]],
        outputs: &mut [&mut [f32]],
        sample_rate: f32,
        params: &ParameterValuesRef,
    ) {
        self.bpm.set_value(*params.get("bpm").and_then(|b|b.get(0)).unwrap_or(&120.0));
        self.inner.set_sample_rate(sample_rate.into());
        self.inner.process_big(128, inputs, outputs);
    }

    fn parameter_descriptors() -> Vec<ParameterDescriptor> {
        vec![ParameterDescriptor {
            name: "bpm".to_string(),
            default_value: 120.0,
            min_value: 0.0,
            max_value: 600.0,
            automation_rate: AutomationRate::KRate,
        }]
    }
}

#[wasm_bindgen]
pub struct ClockDividerNode {
    node: web_sys::AudioWorkletNode,
}

#[wasm_bindgen]
impl ClockDividerNode {
    #[wasm_bindgen(constructor)]
    pub fn new(ctx: &web_sys::AudioContext) -> Result<ClockDividerNode, JsValue> {
        let options = web_sys::AudioWorkletNodeOptions::new();
        options.set_channel_count(1);
        options.set_number_of_inputs(0);
        options.set_number_of_outputs(4);

        let node = ClockDividerProcessor::create_node(ctx, (), Some(&options))?;
        Ok(ClockDividerNode { node })
    }

    #[wasm_bindgen(getter)]
    pub fn node(&self) -> web_sys::AudioWorkletNode {
        self.node.clone()
    }
}

register!(ClockDividerProcessor, "clock");
