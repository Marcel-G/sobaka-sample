use fundsp::hacker::*;
use fundsp::thingbuf::mpsc::{channel, Receiver, Sender};
use wasm_bindgen::{prelude::wasm_bindgen, JsValue};
use waw::{register, AutomationRate, ParameterDescriptor, ParameterValuesRef, Processor};

use crate::debug;

const ZERO_BUFFER: [f32; 128] = [0.0; 128];

#[derive(Clone)]
pub struct ReverbParams {
    pub time: f32,
}

impl Default for ReverbParams {
    fn default() -> Self {
        Self { time: 2.0 }
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
                    if self.current_params.time != params.time {
                        self.current_params = params.clone();
                        self.net.crossfade(
                            self.reverb_id,
                            Fade::Smooth,
                            0.1, // 100ms crossfade
                            create_reverb(params.time),
                        );
                        self.net.commit();
                    }
                }
                Message::None => {}
            }
        }
    }
}
fn create_reverb(time: f32) -> Box<dyn AudioUnit> {
    Box::new(split() >> reverb_stereo(10.0, time, 0.5) >> join())
}

impl Processor for ReverbProcessor {
    type Data = ReverbData;

    fn new(data: Self::Data) -> Self {
        let params = data.params;

        let (mut net, reverb_id) = Net::wrap_id(create_reverb(params.time));

        net = (net * pass()) & (pass() * (1.0 - pass())) >> join();

        let inner = BigBlockAdapter::new(Box::new(net.backend()));

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
        params: &ParameterValuesRef,
    ) {
        self.handle_messages();
        self.inner.set_sample_rate(sample_rate.into());

        let wet_param = params.get("wet").unwrap_or(&ZERO_BUFFER);

        let combined_inputs = [inputs, &[&wet_param]].concat();

        self.inner.process_big(128, &combined_inputs, outputs);

        debug::log_buffer_stats("Reverb", outputs);
    }

    fn parameter_descriptors() -> Vec<ParameterDescriptor> {
        vec![ParameterDescriptor {
            name: "wet".to_string(),
            default_value: 0.5,
            min_value: 0.0,
            max_value: 1.0,
            automation_rate: AutomationRate::ARate,
        }]
    }
}

#[wasm_bindgen]
pub struct ReverbNode {
    wrapper: waw::AudioWorkletNodeWrapper,
    sender: Sender<Message>,
}

#[wasm_bindgen]
impl ReverbNode {
    #[wasm_bindgen(constructor)]
    pub fn new(ctx: &web_sys::AudioContext, time: f32) -> Result<ReverbNode, JsValue> {
        let (sender, receiver) = channel(1);
        let params = ReverbParams { time };
        let data = ReverbData { params, receiver };

        let options = web_sys::AudioWorkletNodeOptions::new();
        options.set_channel_count(1);
        options.set_number_of_inputs(1);
        options.set_number_of_outputs(1);

        let wrapper = ReverbProcessor::create_node(ctx, data, Some(&options))?;
        Ok(ReverbNode { wrapper, sender })
    }

    #[wasm_bindgen(js_name = "setTime")]
    pub fn set_time(&self, time: f32) {
        let params = ReverbParams { time };
        if self.sender.try_send(Message::UpdateParams(params)).is_ok() {};
    }

    #[wasm_bindgen(getter)]
    pub fn node(&self) -> web_sys::AudioWorkletNode {
        self.wrapper.node().clone()
    }
}

register!(ReverbProcessor, "reverb");
