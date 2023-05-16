use std::sync::Arc;

use crate::dsp::trigger::SchmittTrigger;

use async_std::sync::Mutex;
use waw::{
    buffer::{AudioBuffer, ParamBuffer},
    utils::callback::Callback,
    web_sys::{AudioContext, AudioParam, AudioWorkletNode},
    worklet::{sample_rate, AudioModule, Emitter},
};

#[waw::derive::derive_command]
pub enum ScopeCommand {
    SetThreshold(f32),
    SetScale(f32),
}

#[waw::derive::derive_initial_state]
#[derive(Copy)]
pub struct Point {
    pub min: f32,
    pub max: f32,
    pub count: u32,
}

#[waw::derive::derive_initial_state]
#[derive(Default)]
pub struct PointBufferData(pub Vec<Vec<Point>>);

impl Default for Point {
    fn default() -> Self {
        Point {
            min: f32::INFINITY,
            max: f32::NEG_INFINITY,
            count: 0,
        }
    }
}

/// Shared memory buffer for storing scope data for each frame
#[wasm_bindgen]
#[derive(Default)]
pub struct SharedPointBufferData(Arc<Mutex<PointBufferData>>);

impl Clone for SharedPointBufferData {
    fn clone(&self) -> Self {
        Self(self.0.clone())
    }
}

impl SharedPointBufferData {
    pub fn pack(self) -> usize {
        Box::into_raw(Box::new(self)) as usize
    }
    pub unsafe fn unpack(val: usize) -> Self {
        *Box::from_raw(val as *mut _)
    }
}

struct ChannelData {
    next: Point,
    pub points: [Point; 256],
    index: usize,
    frame_count: usize,
}

impl Default for ChannelData {
    fn default() -> Self {
        Self::new()
    }
}

impl ChannelData {
    fn new() -> Self {
        ChannelData {
            points: [Default::default(); 256],
            next: Default::default(),
            index: 0,
            frame_count: 1,
        }
    }

    fn set_frame_count(&mut self, frame_count: usize) {
        self.frame_count = frame_count;
    }

    fn reset(&mut self) {
        self.points = [Default::default(); 256];
        self.index = 0;
    }

    fn push(&mut self, value: &f32) {
        self.next.min = self.next.min.min(*value);
        self.next.max = self.next.max.max(*value);
        self.next.count += 1;

        if self.next.count >= self.frame_count.try_into().unwrap() {
            self.points[self.index] = self.next;
            self.next = Default::default();
            self.index = (self.index + 1) % self.points.len();
        }
    }

    fn is_full(&self) -> bool {
        self.index >= self.points.len() - 1
    }
}

#[waw::derive::derive_initial_state]
pub struct ScopeInitialState {
    pub buffer_ptr: usize,
}

pub struct Scope {
    last_frame_stored: bool,
    trigger: SchmittTrigger,
    channels: [ChannelData; 4],
    buffer: SharedPointBufferData,
    threshold: f64,
}

impl Scope {
    fn store_full_frame(&mut self) {
        // Lock may not be available if the buffer is being read from the main thread
        if let Some(mut buffer) = self.buffer.0.try_lock() {
            buffer.0 = self
                .channels
                .iter()
                .map(|channel| {
                    if channel.points[0].count > 0 {
                        channel.points.to_vec()
                    } else {
                        vec![]
                    }
                })
                .collect();
            self.last_frame_stored = true
        }
    }
    pub fn reset_channels(&mut self) {
        for channel in self.channels.iter_mut() {
            channel.reset();
        }
    }
}

impl AudioModule for Scope {
    type Command = ScopeCommand;
    type InitialState = ScopeInitialState;

    const INPUTS: u32 = 4;
    const OUTPUTS: u32 = 0;

    fn create(initial_state: Option<Self::InitialState>, _emitter: Emitter<Self::Event>) -> Self {
        let buffer = initial_state
            .map(|state| unsafe { SharedPointBufferData::unpack(state.buffer_ptr) })
            .unwrap();

        Scope {
            last_frame_stored: false,
            buffer,
            threshold: 0.0,
            channels: Default::default(),
            trigger: Default::default(),
        }
    }

    fn on_command(&mut self, command: Self::Command) {
        match command {
            ScopeCommand::SetThreshold(val) => self.threshold = val.into(),
            ScopeCommand::SetScale(ms) => {
                let sr = sample_rate();
                let frame_count = (ms * sr as f32 / 256.0) as usize;
                for channel in self.channels.iter_mut() {
                    channel.set_frame_count(frame_count)
                }
            }
        }
    }

    fn process(&mut self, audio: &mut AudioBuffer, _params: &ParamBuffer<Self::Param>) {
        let (inputs, _) = audio.split();
        let trigger_buffer = inputs.get(0).and_then(|i| i.channel(0)); // mono CV input

        for i in 0..128 {
            if let Some(val) = trigger_buffer.and_then(|t| t.get(i)) {
                if self.channels[0].is_full() {
                    if !self.last_frame_stored {
                        self.store_full_frame();
                    }
                    if self
                        .trigger
                        .tick(*val, self.threshold, self.threshold + 0.01)
                        == Some(true)
                    {
                        self.reset_channels();
                        self.last_frame_stored = false
                    }
                } else {
                    for (input, channel) in inputs.iter().zip(self.channels.iter_mut()) {
                        if let Some(val) = input.channel(0).and_then(|c| c.get(i)) {
                            channel.push(val);
                        }
                    }
                }
            }
        }
    }
}

waw::main!(Scope);

// Wrap the `ScopeNode` in a controller. This executes onset detection on the main thread
// when audio data is updated.
#[wasm_bindgen]
pub struct ScopeController {
    node: ScopeNode,
    buffer: SharedPointBufferData,
}

#[wasm_bindgen]
impl ScopeController {
    pub fn frame(&self) -> Option<PointBufferData> {
        // Lock may not be available if the buffer is being read from the main thread
        self.buffer
            .0
            .try_lock()
            .map(|buffer| Some(buffer.clone()))
            .unwrap_or(None)
    }
}

// Forward the node interface onto the controller
// @todo - maybe this should be a trait + Derive macro?
#[wasm_bindgen]
impl ScopeController {
    pub async fn create(ctx: AudioContext) -> Result<ScopeController, JsValue> {
        let buffer = SharedPointBufferData::default();
        let initial_state = Some(ScopeInitialState {
            buffer_ptr: buffer.clone().pack(),
        });

        let node = ScopeNode::create(ctx, initial_state).await.unwrap();

        Ok(ScopeController { buffer, node })
    }
    pub fn command(&self, message: <Scope as AudioModule>::Command) {
        self.node.command(message)
    }
    pub fn node(&self) -> Result<AudioWorkletNode, JsValue> {
        self.node.node()
    }
    pub fn subscribe(&mut self, callback: Callback<<Scope as AudioModule>::Event>) {
        self.node.subscribe(callback)
    }
    pub fn get_param(&self, param: <Scope as AudioModule>::Param) -> AudioParam {
        self.node.get_param(param)
    }
    pub fn destroy(&mut self) {
        self.node.destroy()
    }
}
