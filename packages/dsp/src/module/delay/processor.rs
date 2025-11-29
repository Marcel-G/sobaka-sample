use fundsp::prelude::*;
use wasm_bindgen::{prelude::wasm_bindgen, JsValue};
use waw::{register, AutomationRate, ParameterDescriptor, ParameterValues, Processor};

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
        params: &ParameterValues,
    ) {
        self.delay.set_value(params.get("delay", 1.0));
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
    node: web_sys::AudioWorkletNode,
}

#[wasm_bindgen]
impl DelayNode {
    #[wasm_bindgen(constructor)]
    pub fn new(ctx: &web_sys::AudioContext) -> Result<DelayNode, JsValue> {
        let node = DelayProcessor::create_node(ctx, ())?;
        Ok(DelayNode { node })
    }

    #[wasm_bindgen(getter)]
    pub fn node(&self) -> web_sys::AudioWorkletNode {
        self.node.clone()
    }
}

register!(DelayProcessor, "delay");
