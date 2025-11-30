use fundsp::prelude::*;
use wasm_bindgen::{prelude::wasm_bindgen, JsValue};
use waw::{register, ParameterDescriptor, ParameterValuesRef, Processor};

pub struct NoiseProcessor {
    inner: BigBlockAdapter,
}

impl Processor for NoiseProcessor {
    type Data = ();

    fn new(_data: Self::Data) -> Self {
        let module = white();

        Self {
            inner: BigBlockAdapter::new(Box::new(module)),
        }
    }

    fn process(
        &mut self,
        inputs: &[&[f32]],
        outputs: &mut [&mut [f32]],
        sample_rate: f32,
        _params: &ParameterValuesRef,
    ) {
        self.inner.set_sample_rate(sample_rate.into());
        self.inner.process_big(128, inputs, outputs);
    }

    fn parameter_descriptors() -> Vec<ParameterDescriptor> {
        Default::default()
    }
}

#[wasm_bindgen]
pub struct NoiseNode {
    node: web_sys::AudioWorkletNode,
}

#[wasm_bindgen]
impl NoiseNode {
    #[wasm_bindgen(constructor)]
    pub fn new(ctx: &web_sys::AudioContext) -> Result<NoiseNode, JsValue> {
        let options = web_sys::AudioWorkletNodeOptions::new();
        options.set_channel_count(1);
        options.set_number_of_inputs(0);
        options.set_number_of_outputs(1);

        let node = NoiseProcessor::create_node(ctx, (), Some(&options))?;
        Ok(NoiseNode { node })
    }

    #[wasm_bindgen(getter)]
    pub fn node(&self) -> web_sys::AudioWorkletNode {
        self.node.clone()
    }
}

register!(NoiseProcessor, "noise");
