use fundsp::prelude::*;
use wasm_bindgen::{prelude::wasm_bindgen, JsValue};
use waw::{register, ParameterDescriptor, ParameterValues, Processor};

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
        _params: &ParameterValues,
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
        let node = NoiseProcessor::create_node(ctx, ())?;
        Ok(NoiseNode { node })
    }

    #[wasm_bindgen(getter)]
    pub fn node(&self) -> web_sys::AudioWorkletNode {
        self.node.clone()
    }
}

register!(NoiseProcessor, "noise");
