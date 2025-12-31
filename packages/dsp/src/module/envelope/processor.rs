use fundsp::prelude::*;
use wasm_bindgen::{prelude::wasm_bindgen, JsValue};
use waw::{register, AutomationRate, ParameterDescriptor, ParameterValuesRef, Processor};

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
        params: &ParameterValuesRef,
    ) {
        let attack = params.get("attack").and_then(|b| b.get(0)).unwrap_or(&0.1);
        let release = params.get("release").and_then(|b| b.get(0)).unwrap_or(&0.1);
        self.inner.set(Setting::attack_release(*attack, *release));
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
    wrapper: waw::AudioWorkletNodeWrapper,
}

#[wasm_bindgen]
impl EnvelopeNode {
    #[wasm_bindgen(constructor)]
    pub fn new(ctx: &web_sys::AudioContext) -> Result<EnvelopeNode, JsValue> {
        let options = web_sys::AudioWorkletNodeOptions::new();
        options.set_channel_count(1);
        options.set_number_of_inputs(1);
        options.set_number_of_outputs(1);

        let wrapper = EnvelopeProcessor::create_node(ctx, (), Some(&options))?;
        Ok(EnvelopeNode { wrapper })
    }

    #[wasm_bindgen(getter)]
    pub fn node(&self) -> web_sys::AudioWorkletNode {
        self.wrapper.node().clone()
    }
}

register!(EnvelopeProcessor, "envelope");
