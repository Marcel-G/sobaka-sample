use fundsp::{
    prelude::*,
    thingbuf::mpsc::{channel, Receiver, Sender},
};
use js_sys::Array;
use wasm_bindgen::{prelude::wasm_bindgen, JsValue};
use waw::{register, ParameterDescriptor, ParameterValuesRef, Processor};

use crate::shared::quantiser::{dsp_quantiser, Message};

pub struct QuantiserData {
    notes: [bool; 12],
    receiver: Receiver<Message>,
}

pub struct QuantiserProcessor {
    inner: BigBlockAdapter,
}

impl Processor for QuantiserProcessor {
    type Data = QuantiserData;

    fn new(data: Self::Data) -> Self {
        let module = dsp_quantiser(data.notes, data.receiver);

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
        vec![]
    }
}

#[wasm_bindgen]
pub struct QuantiserNode {
    wrapper: waw::AudioWorkletNodeWrapper,
    sender: Sender<Message>,
}

#[wasm_bindgen]
impl QuantiserNode {
    #[wasm_bindgen(constructor)]
    pub fn new(ctx: &web_sys::AudioContext) -> Result<QuantiserNode, JsValue> {
        let (sender, receiver) = channel(1);
        let data = QuantiserData {
            notes: [false; 12],
            receiver,
        };
        let options = web_sys::AudioWorkletNodeOptions::new();
        options.set_channel_count(1);
        options.set_number_of_inputs(1);
        options.set_number_of_outputs(1);

        let wrapper = QuantiserProcessor::create_node(ctx, data, Some(&options))?;
        Ok(QuantiserNode { wrapper, sender })
    }

    // TODO: better type for notes
    #[wasm_bindgen(js_name = "updateNotes")]
    pub fn update_notes(&self, notes: Array) {
        let notes: [bool; 12] = notes
            .to_vec()
            .iter()
            .map(|val| val.as_bool().expect("must be boolean"))
            .collect::<Vec<bool>>()
            .as_slice()
            .try_into()
            .expect("list of 12 booleans");

        if self.sender.try_send(Message::UpdateNotes(notes)).is_ok() {};
    }

    #[wasm_bindgen(getter)]
    pub fn node(&self) -> web_sys::AudioWorkletNode {
        self.wrapper.node().clone()
    }
}

register!(QuantiserProcessor, "quantiser");
