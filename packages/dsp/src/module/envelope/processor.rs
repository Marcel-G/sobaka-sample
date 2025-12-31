use fundsp::{
    prelude::*,
    thingbuf::mpsc::{channel, Receiver, Sender},
};
use wasm_bindgen::{prelude::wasm_bindgen, JsValue};
use waw::{register, ParameterDescriptor, ParameterValuesRef, Processor};

use crate::util::trigger::{trigger_tx, GateEvent};

pub struct EnvelopeProcessor {
    inner: BigBlockAdapter,
    net: Net,
    envelope_id: NodeId,
    receiver: Receiver<Message>,
}

pub struct EnvelopeData {
    receiver: Receiver<Message>,
    state: EnvelopeState,
    sender: Sender<GateEvent>,
}

#[wasm_bindgen]
#[derive(Clone)]
pub struct EnvelopeState {
    attack: f32,
    decay: f32,
    sustain: f32,
    release: f32,
}

#[wasm_bindgen]
impl EnvelopeState {
    #[wasm_bindgen(constructor)]
    pub fn new(attack: f32, decay: f32, sustain: f32, release: f32) -> Self {
        Self {
            attack,
            decay,
            sustain,
            release,
        }
    }
}

#[derive(Default, Clone)]
enum Message {
    #[default]
    None,
    UpdateState(EnvelopeState),
}

impl EnvelopeProcessor {
    fn handle_messages(&mut self) {
        while let Ok(message) = self.receiver.try_recv() {
            match message {
                Message::UpdateState(state) => {
                    self.net.crossfade(
                        self.envelope_id,
                        Fade::Smooth,
                        0.01, // 10ms crossfade
                        Box::new(adsr_live(
                            state.attack,
                            state.decay,
                            state.sustain,
                            state.release,
                        )),
                    );
                    self.net.commit();
                }
                Message::None => {}
            }
        }
    }
}

impl Processor for EnvelopeProcessor {
    type Data = EnvelopeData;

    fn new(data: Self::Data) -> Self {
        let state = data.state;

        let (mut envelope, envelope_id) = Net::wrap_id(Box::new(adsr_live(
            state.attack,
            state.decay,
            state.sustain,
            state.release,
        )));

        envelope = trigger_tx(0.0, data.sender) >> envelope;

        let inner = BigBlockAdapter::new(Box::new(envelope.backend()));

        Self {
            net: envelope,
            envelope_id,
            receiver: data.receiver,
            inner,
        }
    }

    fn process(
        &mut self,
        inputs: &[&[f32]],
        outputs: &mut [&mut [f32]],
        sample_rate: f32,
        _params: &ParameterValuesRef,
    ) {
        self.handle_messages();
        self.inner.set_sample_rate(sample_rate.into());

        self.inner.process_big(128, inputs, outputs);
    }

    fn parameter_descriptors() -> Vec<ParameterDescriptor> {
        Default::default()
    }
}

#[wasm_bindgen]
pub struct EnvelopeNode {
    wrapper: waw::AudioWorkletNodeWrapper,
    sender: Sender<Message>,
    receiver: Receiver<GateEvent>,
}

#[wasm_bindgen]
impl EnvelopeNode {
    #[wasm_bindgen(constructor)]
    pub fn new(
        ctx: &web_sys::AudioContext,
        initial_state: EnvelopeState,
    ) -> Result<EnvelopeNode, JsValue> {
        let (sender, receiver) = channel(1);
        let (trig_sender, trig_receiver) = channel(128);
        let data = EnvelopeData {
            state: initial_state,
            receiver,
            sender: trig_sender,
        };
        let options = web_sys::AudioWorkletNodeOptions::new();
        options.set_channel_count(1);
        options.set_number_of_inputs(1);
        options.set_number_of_outputs(1);

        let wrapper = EnvelopeProcessor::create_node(ctx, data, Some(&options))?;
        Ok(EnvelopeNode {
            wrapper,
            sender,
            receiver: trig_receiver,
        })
    }

    #[wasm_bindgen(getter)]
    pub fn node(&self) -> web_sys::AudioWorkletNode {
        self.wrapper.node().clone()
    }

    #[wasm_bindgen(js_name = "updateState")]
    pub fn update_state(&self, state: EnvelopeState) {
        if self.sender.try_send(Message::UpdateState(state)).is_ok() {};
    }

    #[wasm_bindgen(js_name = "pollEvent")]
    pub fn poll_event(&self) -> Option<GateEvent> {
        self.receiver.try_recv().ok()
    }
}

register!(EnvelopeProcessor, "envelope");
