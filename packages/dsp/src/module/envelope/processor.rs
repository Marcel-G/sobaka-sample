use fundsp::prelude::*;
use wasm_bindgen::{prelude::wasm_bindgen, JsValue};
use waw::{register, AutomationRate, ParameterDescriptor, ParameterValues, Processor};

pub struct EnvelopeProcessor {
    inner: BigBlockAdapter,
}

impl Processor for EnvelopeProcessor {
    type Data = ();

    fn new(_data: Self::Data) -> Self {
        let module = afollow(0.1, 1.0);

        Self {
            inner: BigBlockAdapter::new(Box::new(module)),
        }
    }

    fn process(
        &mut self,
        inputs: &[&[f32]],
        outputs: &mut [&mut [f32]],
        sample_rate: f32,
        params: &ParameterValues,
    ) {
        let attack = params.get("attack", 0.1);
        let release = params.get("release", 0.1);
        self.inner.set(Setting::attack_release(attack, release));
        self.inner.set_sample_rate(sample_rate.into());
        self.inner.process_big(128, inputs, outputs);
    }

    fn parameter_descriptors() -> Vec<ParameterDescriptor> {
        vec![
            ParameterDescriptor {
                name: "attack".to_string(),
                default_value: 0.1,
                min_value: 0.0,
                max_value: 1.0,
                automation_rate: AutomationRate::KRate,
            },
            ParameterDescriptor {
                name: "release".to_string(),
                default_value: 0.1,
                min_value: 0.0,
                max_value: 1.0,
                automation_rate: AutomationRate::KRate,
            },
        ]
    }
}

#[wasm_bindgen]
pub struct EnvelopeNode {
    node: web_sys::AudioWorkletNode,
}

#[wasm_bindgen]
impl EnvelopeNode {
    #[wasm_bindgen(constructor)]
    pub fn new(ctx: &web_sys::AudioContext) -> Result<EnvelopeNode, JsValue> {
        let node = EnvelopeProcessor::create_node(ctx, ())?;
        Ok(EnvelopeNode { node })
    }

    #[wasm_bindgen(getter)]
    pub fn node(&self) -> web_sys::AudioWorkletNode {
        self.node.clone()
    }
}

register!(EnvelopeProcessor, "envelope");
