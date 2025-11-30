use fundsp::prelude::*;
use wasm_bindgen::{prelude::wasm_bindgen, JsValue};
use waw::{register, AutomationRate, ParameterDescriptor, ParameterValuesRef, Processor};

pub struct FilterProcessor {
    inner: BigBlockAdapter,
}

impl Processor for FilterProcessor {
    type Data = ();

    fn new(_data: Self::Data) -> Self {
        let module = lowpass::<f32>() ^ highpass::<f32>() ^ bandpass::<f32>() ^ moog::<f32>();

        Self {
            inner: BigBlockAdapter::new(Box::new(module)),
        }
    }

    fn process(
        &mut self,
        inputs: &[&[f32]],
        outputs: &mut [&mut [f32]],
        sample_rate: f32,
        params: &ParameterValuesRef,
    ) {
        let q = *params.get("q").and_then(|b|b.get(0)).unwrap_or(&0.1);
        let frequency = *params.get("frequency").and_then(|b|b.get(0)).unwrap_or(&0.1); // TODO: Audio-rate frequency.
        self.inner.set(Setting::center_q(frequency, q));
        self.inner.set_sample_rate(sample_rate.into());
        self.inner.process_big(128, inputs, outputs);
    }

    fn parameter_descriptors() -> Vec<ParameterDescriptor> {
        vec![
            ParameterDescriptor {
                name: "q".to_string(),
                default_value: 0.1,
                min_value: 0.0,
                max_value: 1.0,
                automation_rate: AutomationRate::KRate,
            },
            ParameterDescriptor {
                name: "frequency".to_string(),
                default_value: 0.1,
                min_value: 0.0,
                max_value: 1.0,
                automation_rate: AutomationRate::ARate,
            },
        ]
    }
}

#[wasm_bindgen]
pub struct FilterNode {
    node: web_sys::AudioWorkletNode,
}

#[wasm_bindgen]
impl FilterNode {
    #[wasm_bindgen(constructor)]
    pub fn new(ctx: &web_sys::AudioContext) -> Result<FilterNode, JsValue> {
        let options = web_sys::AudioWorkletNodeOptions::new();
        options.set_channel_count(1);
        options.set_number_of_inputs(1);
        options.set_number_of_outputs(4);

        let node = FilterProcessor::create_node(ctx, (), Some(&options))?;
        Ok(FilterNode { node })
    }

    #[wasm_bindgen(getter)]
    pub fn node(&self) -> web_sys::AudioWorkletNode {
        self.node.clone()
    }
}

register!(FilterProcessor, "filter");
