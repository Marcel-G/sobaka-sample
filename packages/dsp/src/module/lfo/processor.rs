use fundsp::{
    hacker::*,
    thingbuf::mpsc::{channel, Receiver, Sender},
};
use wasm_bindgen::{prelude::wasm_bindgen, JsValue};
use waw::{register, AutomationRate, ParameterDescriptor, ParameterValuesRef, Processor};

use crate::debug;

const ZERO_BUFFER: [f32; 128] = [0.0; 128];

#[wasm_bindgen]
#[derive(Clone, PartialEq)]
pub enum LfoShape {
    Sine,
    Triangle,
    Square,
    Saw,
    ReverseSaw,
}

pub struct LfoData {
    shape: LfoShape,
    receiver: Receiver<Message>,
}

#[derive(Default, Clone)]
enum Message {
    #[default]
    None,
    SetShape(LfoShape),
}

pub struct LfoProcessor {
    current_shape: LfoShape,
    net: Net,
    lfo_id: NodeId,
    inner: BigBlockAdapter,
    receiver: Receiver<Message>,
}

impl LfoProcessor {
    fn handle_messages(&mut self) {
        while let Ok(message) = self.receiver.try_recv() {
            match message {
                Message::SetShape(shape) => {
                    if self.current_shape != shape {
                        self.current_shape = shape.clone();
                        self.net.crossfade(
                            self.lfo_id,
                            Fade::Smooth,
                            0.01, // 10ms crossfade
                            create_lfo_oscillator(&shape),
                        );
                        self.net.commit();
                    }
                }
                Message::None => {}
            }
        }
    }
}

/// Create an LFO oscillator unit for the given shape.
/// LFO oscillators output in the range [-1, 1].
fn create_lfo_oscillator(shape: &LfoShape) -> Box<dyn AudioUnit> {
    match shape {
        LfoShape::Sine => Box::new(sine()),
        LfoShape::Triangle => Box::new(triangle()),
        LfoShape::Square => Box::new(square()),
        LfoShape::Saw => Box::new(saw()),
        LfoShape::ReverseSaw => Box::new(saw() * dc(-1.0)),
    }
}

impl Processor for LfoProcessor {
    type Data = LfoData;

    fn new(data: Self::Data) -> Self {
        let (mut net, lfo_id) = Net::wrap_id(create_lfo_oscillator(&data.shape));

        // LFO output is already in [-1, 1] range, suitable for modulation
        net = net >> shape(Tanh(0.9));

        let inner = BigBlockAdapter::new(Box::new(net.backend()));

        Self {
            current_shape: data.shape,
            net,
            lfo_id,
            inner,
            receiver: data.receiver,
        }
    }

    fn process(
        &mut self,
        _inputs: &[&[f32]],
        outputs: &mut [&mut [f32]],
        sample_rate: f32,
        params: &ParameterValuesRef,
    ) {
        self.handle_messages();
        self.inner.set_sample_rate(sample_rate.into());

        // Rate is in Hz (0.01 to 30 Hz for LFO range)
        let rate = params.get("rate").unwrap_or(&ZERO_BUFFER);

        self.inner.process_big(128, &[rate], outputs);

        debug::log_buffer_stats("LFO", outputs);
    }

    fn parameter_descriptors() -> Vec<ParameterDescriptor> {
        vec![ParameterDescriptor {
            name: "rate".to_string(),
            default_value: 1.0,
            min_value: 0.01,
            max_value: 30.0,
            automation_rate: AutomationRate::KRate,
        }]
    }
}

#[wasm_bindgen]
pub struct LfoNode {
    wrapper: waw::AudioWorkletNodeWrapper,
    sender: Sender<Message>,
}

#[wasm_bindgen]
impl LfoNode {
    #[wasm_bindgen(constructor)]
    pub fn new(ctx: &web_sys::AudioContext, shape: LfoShape) -> Result<LfoNode, JsValue> {
        let (sender, receiver) = channel(1);
        let data = LfoData { shape, receiver };
        let options = web_sys::AudioWorkletNodeOptions::new();
        options.set_channel_count(1);
        options.set_number_of_inputs(0);
        options.set_number_of_outputs(1);

        let wrapper = LfoProcessor::create_node(ctx, data, Some(&options))?;
        Ok(LfoNode { wrapper, sender })
    }

    #[wasm_bindgen(js_name = "setShape")]
    pub fn set_shape(&self, shape: LfoShape) {
        if self.sender.try_send(Message::SetShape(shape)).is_ok() {};
    }

    #[wasm_bindgen(getter)]
    pub fn node(&self) -> web_sys::AudioWorkletNode {
        self.wrapper.node().clone()
    }
}

register!(LfoProcessor, "lfo");
