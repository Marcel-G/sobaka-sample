use fundsp::prelude::*;
use wasm_bindgen::{prelude::wasm_bindgen, JsValue};
use waw::{register, ParameterDescriptor, ParameterValuesRef, Processor};

use crate::util::trigger::SchmittTrigger;

pub struct SampleAndHoldProcessor {
    inner: BigBlockAdapter,
}

#[derive(Clone)]
pub struct Hold {
    trigger: SchmittTrigger,
    off_threshold: f64,
    on_threshold: f64,
    signal: f32,
}

impl Hold {
    pub fn new() -> Self {
        Self {
            trigger: SchmittTrigger::default(),
            off_threshold: 0.0,
            on_threshold: 0.001,
            signal: 0.0,
        }
    }
}

impl AudioNode for Hold {
    const ID: u64 = 99;
    type Inputs = U2;
    type Outputs = U1;

    #[inline]
    fn tick(&mut self, input: &Frame<f32, Self::Inputs>) -> Frame<f32, Self::Outputs> {
        let gate = input[0];
        let signal = input[1];

        if let Some(true) = self
            .trigger
            .tick(gate, self.off_threshold, self.on_threshold)
        {
            self.signal = signal;
        }

        Frame::splat(self.signal)
    }
}

#[inline]
pub fn hold() -> An<Hold> {
    An(Hold::new())
}

impl Processor for SampleAndHoldProcessor {
    type Data = ();

    fn new(_data: Self::Data) -> Self {
        Self {
            inner: BigBlockAdapter::new(Box::new(hold())),
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
pub struct SampleAndHoldNode {
    node: web_sys::AudioWorkletNode,
}

#[wasm_bindgen]
impl SampleAndHoldNode {
    #[wasm_bindgen(constructor)]
    pub fn new(ctx: &web_sys::AudioContext) -> Result<SampleAndHoldNode, JsValue> {
        let options = web_sys::AudioWorkletNodeOptions::new();
        options.set_channel_count(1);
        options.set_number_of_inputs(2);
        options.set_number_of_outputs(1);

        let node = SampleAndHoldProcessor::create_node(ctx, (), Some(&options))?;
        Ok(SampleAndHoldNode { node })
    }

    #[wasm_bindgen(getter)]
    pub fn node(&self) -> web_sys::AudioWorkletNode {
        self.node.clone()
    }
}

register!(SampleAndHoldProcessor, "sample-and-hold");
