use fundsp::hacker::*;
use fundsp::thingbuf::mpsc::{channel, Receiver, Sender};
use wasm_bindgen::{prelude::wasm_bindgen, JsValue};
use waw::{register, AutomationRate, ParameterDescriptor, ParameterValuesRef, Processor};

use crate::debug;

#[derive(Clone)]
pub struct ReverbParams {
    pub room_size: f32,
    pub damping: f32,
    pub wet: f32,
}

impl Default for ReverbParams {
    fn default() -> Self {
        Self {
            room_size: 10.0,
            damping: 2.0,
            wet: 0.5,
        }
    }
}

pub struct ReverbData {
    params: ReverbParams,
    receiver: Receiver<Message>,
}

#[derive(Default, Clone)]
enum Message {
    #[default]
    None,
    UpdateParams(ReverbParams),
}

pub struct ReverbProcessor {
    current_params: ReverbParams,
    net: Net,
    reverb_id: NodeId,
    inner: BigBlockAdapter,
    receiver: Receiver<Message>,
}

impl ReverbProcessor {
    fn handle_messages(&mut self) {
        while let Ok(message) = self.receiver.try_recv() {
            match message {
                Message::UpdateParams(params) => {
                    self.current_params = params.clone();
                    // Create new reverb with updated parameters
                    let new_reverb = split() 
                        >> reverb_stereo(params.room_size, params.damping, params.wet) 
                        >> join();
                    // Crossfade to avoid clicks
                    self.net.crossfade(
                        self.reverb_id,
                        Fade::Smooth,
                        0.1, // 100ms crossfade
                        Box::new(new_reverb),
                    );
                    self.net.commit();
                }
                Message::None => {}
            }
        }
    }
}

impl Processor for ReverbProcessor {
    type Data = ReverbData;

    fn new(data: Self::Data) -> Self {
        let params = data.params;
        let mut net = Net::new(1, 1);
        let reverb = split() >> reverb_stereo(params.room_size, params.damping, params.wet) >> join();
        let reverb_id = net.chain(Box::new(reverb));
        let backend = net.backend();
        let inner = BigBlockAdapter::new(Box::new(backend));

        Self {
            current_params: params,
            net,
            reverb_id,
            inner,
            receiver: data.receiver,
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

        debug::log_buffer_stats("Reverb", outputs);
    }

    fn parameter_descriptors() -> Vec<ParameterDescriptor> {
        vec![
            ParameterDescriptor {
                name: "room_size".to_string(),
                default_value: 10.0,
                min_value: 0.1,
                max_value: 50.0,
                automation_rate: AutomationRate::KRate,
            },
            ParameterDescriptor {
                name: "damping".to_string(),
                default_value: 2.0,
                min_value: 0.1,
                max_value: 10.0,
                automation_rate: AutomationRate::KRate,
            },
            ParameterDescriptor {
                name: "wet".to_string(),
                default_value: 0.5,
                min_value: 0.0,
                max_value: 1.0,
                automation_rate: AutomationRate::KRate,
            },
        ]
    }
}

#[wasm_bindgen]
pub struct ReverbNode {
    node: web_sys::AudioWorkletNode,
    sender: Sender<Message>,
}

#[wasm_bindgen]
impl ReverbNode {
    #[wasm_bindgen(constructor)]
    pub fn new(
        ctx: &web_sys::AudioContext,
        room_size: f32,
        damping: f32,
        wet: f32,
    ) -> Result<ReverbNode, JsValue> {
        let (sender, receiver) = channel(1);
        let params = ReverbParams {
            room_size,
            damping,
            wet,
        };
        let data = ReverbData { params, receiver };
        
        let options = web_sys::AudioWorkletNodeOptions::new();
        options.set_channel_count(1);
        options.set_number_of_inputs(1);
        options.set_number_of_outputs(1);

        let node = ReverbProcessor::create_node(ctx, data, Some(&options))?;
        Ok(ReverbNode { node, sender })
    }

    #[wasm_bindgen(js_name = "setParams")]
    pub fn set_params(&self, room_size: f32, damping: f32, wet: f32) {
        let params = ReverbParams {
            room_size,
            damping,
            wet,
        };
        if self.sender.try_send(Message::UpdateParams(params)).is_ok() {};
    }

    #[wasm_bindgen(getter)]
    pub fn node(&self) -> web_sys::AudioWorkletNode {
        self.node.clone()
    }
}

register!(ReverbProcessor, "reverb");
