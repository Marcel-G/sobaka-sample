use fundsp::prelude::*;
use wasm_bindgen::{prelude::wasm_bindgen, JsValue};
use waw::{register, ParameterDescriptor, ParameterValues, Processor};

pub struct ReverbProcessor {
    inner: BigBlockAdapter,
}

impl Processor for ReverbProcessor {
    type Data = ();

    fn new(_data: Self::Data) -> Self {
        let module = reverb_stereo(10.0, 2.0, 0.5);

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
        // vec![ParameterDescriptor {
        //     name: "delay".to_string(),
        //     default_value: 1.0,
        //     min_value: 0.0,
        //     max_value: 8.0,
        //     automation_rate: AutomationRate::KRate,
        // }]
        // vec![ParameterDescriptor {
        //     name: "wet".to_string(),
        //     default_value: 1.0,
        //     min_value: 0.0,
        //     max_value: 8.0,
        //     automation_rate: AutomationRate::ARate,
        // }]
    }
}

#[wasm_bindgen]
pub struct ReverbNode {
    node: web_sys::AudioWorkletNode,
}

#[wasm_bindgen]
impl ReverbNode {
    #[wasm_bindgen(constructor)]
    pub fn new(ctx: &web_sys::AudioContext) -> Result<ReverbNode, JsValue> {
        let node = ReverbProcessor::create_node(ctx, ())?;
        Ok(ReverbNode { node })
    }

    #[wasm_bindgen(getter)]
    pub fn node(&self) -> web_sys::AudioWorkletNode {
        self.node.clone()
    }
}

register!(ReverbProcessor, "reverb");
