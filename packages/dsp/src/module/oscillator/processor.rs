use crate::{debug, util::conversion::volt_hz};
use fundsp::{
    prelude::*,
    thingbuf::mpsc::{channel, Receiver, Sender},
};
use wasm_bindgen::{prelude::wasm_bindgen, JsValue};
use waw::{register, AutomationRate, ParameterDescriptor, ParameterValuesRef, Processor};

const ZERO_BUFFER: [f32; 128] = [0.0; 128];

#[wasm_bindgen]
#[derive(Clone)]
pub enum OscillatorShape {
    Sine,
    Square,
    Triangle,
    Saw,
}

pub struct OscillatorData {
    shape: OscillatorShape,
    receiver: Receiver<Message>,
}

#[derive(Default, Clone)]
enum Message {
    #[default]
    None,
    SetShape(OscillatorShape),
}

pub struct OscillatorProcessor {
    current_shape: OscillatorShape,
    sine: BigBlockAdapter,
    triangle: BigBlockAdapter,
    saw: BigBlockAdapter,
    square: BigBlockAdapter,
    receiver: Receiver<Message>,
}

impl OscillatorProcessor {
    fn handle_messages(&mut self) {
        while let Ok(message) = self.receiver.try_recv() {
            match message {
                Message::SetShape(shape) => self.current_shape = shape,
                Message::None => {}
            }
        }
    }
}

impl Processor for OscillatorProcessor {
    type Data = OscillatorData;

    fn new(data: Self::Data) -> Self {
        let saw = saw() >> shape(Tanh(0.8));
        let sine = sine::<f32>() >> shape(Tanh(0.8));
        let square = square() >> shape(Tanh(0.8));
        let triangle = triangle() >> shape(Tanh(0.8));

        Self {
            current_shape: data.shape,
            receiver: data.receiver,
            saw: BigBlockAdapter::new(Box::new(saw)),
            sine: BigBlockAdapter::new(Box::new(sine)),
            square: BigBlockAdapter::new(Box::new(square)),
            triangle: BigBlockAdapter::new(Box::new(triangle)),
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

        let pitch = params.get("pitch").unwrap_or(&ZERO_BUFFER);
        let pitch_hz: Vec<f32> = pitch.iter().map(|&v| volt_hz(v)).collect();

        let module = match self.current_shape {
            OscillatorShape::Sine => &mut self.sine,
            OscillatorShape::Square => &mut self.square,
            OscillatorShape::Triangle => &mut self.triangle,
            OscillatorShape::Saw => &mut self.saw,
        };
        module.set_sample_rate(sample_rate.into());
        module.process_big(128, &[&pitch_hz], outputs);

        debug::log_buffer_stats("Oscillator", outputs);
    }

    fn parameter_descriptors() -> Vec<ParameterDescriptor> {
        vec![ParameterDescriptor {
            name: "pitch".to_string(),
            default_value: 1.0,
            min_value: 0.0,
            max_value: 8.0,
            automation_rate: AutomationRate::ARate,
        }]
    }
}

#[wasm_bindgen]
pub struct OscillatorNode {
    node: web_sys::AudioWorkletNode,
    sender: Sender<Message>,
}

#[wasm_bindgen]
impl OscillatorNode {
    #[wasm_bindgen(constructor)]
    pub fn new(
        ctx: &web_sys::AudioContext,
        shape: OscillatorShape,
    ) -> Result<OscillatorNode, JsValue> {
        let (sender, receiver) = channel(1);
        let data = OscillatorData { shape, receiver };
        let options = web_sys::AudioWorkletNodeOptions::new();
        options.set_channel_count(1);
        options.set_number_of_inputs(0);
        options.set_number_of_outputs(1);

        let node = OscillatorProcessor::create_node(ctx, data, Some(&options))?;
        Ok(OscillatorNode { node, sender })
    }

    #[wasm_bindgen(js_name = "setShape")]
    pub fn set_shape(&self, shape: OscillatorShape) {
        if self.sender.try_send(Message::SetShape(shape)).is_ok() {};
    }

    #[wasm_bindgen(getter)]
    pub fn node(&self) -> web_sys::AudioWorkletNode {
        self.node.clone()
    }
}

register!(OscillatorProcessor, "oscillator");
