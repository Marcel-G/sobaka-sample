use fundsp::prelude::*;
use wasm_bindgen::{prelude::wasm_bindgen, JsValue};
use waw::{register, AutomationRate, ParameterDescriptor, ParameterValuesRef, Processor};

const ZERO_BUFFER: [f32; 128] = [0.0; 128];

pub struct DelayProcessor {
    inner: BigBlockAdapter,
}

impl Processor for DelayProcessor {
    type Data = ();

    fn new(_data: Self::Data) -> Self {
        let module = tap(0.0, 10.0);

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
        let delay_param = params.get("delay").unwrap_or(&ZERO_BUFFER);

        let combined_inputs = [inputs, &[&delay_param]].concat();

        self.inner.set_sample_rate(sample_rate.into());
        self.inner.process_big(128, &combined_inputs, outputs);
    }

    fn parameter_descriptors() -> Vec<ParameterDescriptor> {
        vec![ParameterDescriptor {
            name: "delay".to_string(),
            default_value: 1.0,
            min_value: 0.0,
            max_value: 10.0,
            automation_rate: AutomationRate::ARate,
        }]
    }
}

#[wasm_bindgen]
pub struct DelayNode {
    wrapper: waw::AudioWorkletNodeWrapper,
}

#[wasm_bindgen]
impl DelayNode {
    #[wasm_bindgen(constructor)]
    pub fn new(ctx: &web_sys::AudioContext) -> Result<DelayNode, JsValue> {
        let options = web_sys::AudioWorkletNodeOptions::new();
        options.set_channel_count(1);
        options.set_number_of_inputs(1);
        options.set_number_of_outputs(1);

        let wrapper = DelayProcessor::create_node(ctx, (), Some(&options))?;
        Ok(DelayNode { wrapper })
    }

    #[wasm_bindgen(getter)]
    pub fn node(&self) -> web_sys::AudioWorkletNode {
        self.wrapper.node().clone()
    }
}

register!(DelayProcessor, "delay");
