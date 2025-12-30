use fundsp::prelude::*;
use wasm_bindgen::{prelude::wasm_bindgen, JsValue};
use waw::{register, ParameterDescriptor, ParameterValuesRef, Processor};

use crate::debug;

pub struct ReverbProcessor {
    inner: BigBlockAdapter,
}

impl Processor for ReverbProcessor {
    type Data = ();

    fn new(_data: Self::Data) -> Self {
        let mono_reverb = split() >> reverb_stereo(10.0, 2.0, 0.5) >> join();

        Self {
            inner: BigBlockAdapter::new(Box::new(mono_reverb)),
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

        debug::log_buffer_stats("Reverb", outputs);
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
        let options = web_sys::AudioWorkletNodeOptions::new();
        options.set_channel_count(1);
        options.set_number_of_inputs(1);
        options.set_number_of_outputs(1);

        let node = ReverbProcessor::create_node(ctx, (), Some(&options))?;
        Ok(ReverbNode { node })
    }

    #[wasm_bindgen(getter)]
    pub fn node(&self) -> web_sys::AudioWorkletNode {
        self.node.clone()
    }
}

register!(ReverbProcessor, "reverb");
