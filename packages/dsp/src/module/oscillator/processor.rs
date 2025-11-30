use fundsp::{
    prelude::*,
    thingbuf::mpsc::{channel, Receiver, Sender},
};
use wasm_bindgen::{prelude::wasm_bindgen, JsValue};
use waw::{register, AutomationRate, ParameterDescriptor, ParameterValues, Processor};

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

/// Convert 1v per octave to hz
pub fn volt_hz<T: Float>(voltage: T) -> T {
    T::from_f64(16.35 * 2.0_f64.powf(voltage.to_f64()))
}

pub struct OscillatorProcessor {
    current_shape: OscillatorShape,
    frequency: Shared,
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
        let frequency = shared(220.0);

        let saw = var(&frequency) >> saw() >> shape(Tanh(0.8));
        let sine = var(&frequency) >> sine::<f32>() >> shape(Tanh(0.8));
        let square = var(&frequency) >> square() >> shape(Tanh(0.8));
        let triangle = var(&frequency) >> triangle() >> shape(Tanh(0.8));

        Self {
            current_shape: data.shape,
            frequency,
            receiver: data.receiver,
            saw: BigBlockAdapter::new(Box::new(saw)),
            sine: BigBlockAdapter::new(Box::new(sine)),
            square: BigBlockAdapter::new(Box::new(square)),
            triangle: BigBlockAdapter::new(Box::new(triangle)),
        }
    }

    fn process(
        &mut self,
        inputs: &[&[f32]],
        outputs: &mut [&mut [f32]],
        sample_rate: f32,
        params: &ParameterValues,
    ) {
        self.handle_messages();
        let pitch = params.get("pitch", 1.0); // TODO: Audio-rate frequency.
        self.frequency.set_value(volt_hz(pitch));

        let module = match self.current_shape {
            OscillatorShape::Sine => &mut self.sine,
            OscillatorShape::Square => &mut self.square,
            OscillatorShape::Triangle => &mut self.triangle,
            OscillatorShape::Saw => &mut self.saw,
        };
        module.set_sample_rate(sample_rate.into());
        module.process_big(128, inputs, outputs);
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
    pub fn new(ctx: &web_sys::AudioContext) -> Result<OscillatorNode, JsValue> {
        let (sender, receiver) = channel(1);
        let data = OscillatorData {
            shape: OscillatorShape::Saw,
            receiver,
        };
        let node = OscillatorProcessor::create_node(ctx, data)?;
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
