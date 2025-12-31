use fundsp::prelude::*;
use wasm_bindgen::{prelude::wasm_bindgen, JsValue};
use waw::{register, AutomationRate, ParameterDescriptor, ParameterValuesRef, Processor};

pub struct DelayProcessor {
    inner: BigBlockAdapter,
    delay: Shared,
}

impl Processor for DelayProcessor {
    type Data = ();

    fn new(_data: Self::Data) -> Self {
        let delay = shared(1.0);

        let module = (pass() | var(&delay)) >> tap(0.0, 10.0);

        Self {
            inner: BigBlockAdapter::new(Box::new(module)),
            delay,
        }
    }

    fn process(
        &mut self,
        inputs: &[&[f32]],
        outputs: &mut [&mut [f32]],
        sample_rate: f32,
        params: &ParameterValuesRef,
    ) {
        self.delay
            .set_value(*params.get("delay").and_then(|b| b.get(0)).unwrap_or(&1.0));
        self.inner.set_sample_rate(sample_rate.into());
        self.inner.process_big(128, inputs, outputs);
    }

    fn parameter_descriptors() -> Vec<ParameterDescriptor> {
        vec![ParameterDescriptor {
            name: "delay".to_string(),
            default_value: 1.0,
            min_value: 0.0,
            max_value: 10.0,
            automation_rate: AutomationRate::KRate,
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
        options.set_number_of_outputs(4);

        let wrapper = DelayProcessor::create_node(ctx, (), Some(&options))?;
        Ok(DelayNode { wrapper })
    }

    #[wasm_bindgen(getter)]
    pub fn node(&self) -> web_sys::AudioWorkletNode {
        self.wrapper.node().clone()
    }
}

register!(DelayProcessor, "delay");
