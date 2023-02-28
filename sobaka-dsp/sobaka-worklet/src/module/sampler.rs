use crate::{
    dsp::{
        onset::{onset, superflux_diff_spec, Spectrogram},
        trigger::SchmittTrigger,
    },
    media_manager::SharedAudio,
    worker,
};
use std::sync::Arc;
use std::{
    collections::{hash_map::Entry, HashMap},
    ops::Deref,
};

use async_std::sync::{Mutex, RwLock};
use waw::{
    buffer::{AudioBuffer, ParamBuffer},
    utils::callback::Callback,
    web_sys::{AudioContext, AudioParam, AudioWorkletNode},
    worklet::{AudioModule, Emitter},
};

#[waw::derive::derive_event]
#[derive(Clone)]
pub enum SamplerEvent {
    /// Detections are sent back to update the UI (see `SamplerCommand::OnDetect`)
    OnDetect(Vec<u32>),
    /// Fired when a new segment is triggered
    OnTrigger(u32),
}

#[waw::derive::derive_command]
pub enum SamplerCommand {
    /// Change the currently active audio file. Accepts a raw pointer to SharedAudio.
    ChangeAudio(usize),
    /// Fired when detections have been recalculated on the main thread
    OnDetect(Vec<u32>),
    /// Set Sample
    SetSample(u32),
}

#[waw::derive::derive_param]
pub enum SequencerParams {
    #[param(
        automation_rate = "a-rate",
        min_value = 0.,
        max_value = 10.,
        default_value = 1.
    )]
    Rate,
}

pub struct Sampler {
    emitter: Emitter<SamplerEvent>,
    segments: Option<Vec<usize>>,
    clock_trigger: SchmittTrigger,
    active_segment: usize,
    voices: Vec<Voice>,
    audio: Option<SharedAudio>,
    rate: f32,
}

#[derive(Clone)]
struct Voice {
    active: bool,
    position: f32,
    start_index: usize,
    end_index: usize,
    rate: f32,
}

impl Default for Voice {
    fn default() -> Self {
        Self {
            active: false,
            position: 0.0,
            start_index: 0,
            end_index: 0,
            rate: 1.0,
        }
    }
}

impl Sampler {
    fn trigger(&mut self) {
        let start = self
            .segments
            .as_ref()
            .and_then(|seg| seg.get(self.active_segment));

        let end = self
            .segments
            .as_ref()
            .and_then(|seg| seg.get(self.active_segment + 1));

        if let (Some(start_index), Some(end_index)) = (start, end) {
            // Send event to the UI
            self.emitter
                .send(SamplerEvent::OnTrigger(self.active_segment as u32));

            // Try and find an inactive voice to use
            if let Some(voice) = self.voices.iter_mut().find(|voice| !voice.active) {
                voice.active = true;
                voice.start_index = *start_index;
                voice.end_index = *end_index;
                voice.position = 0.0;
                voice.rate = self.rate;
                return;
            }

            // Otherwise find the one that's the closest to finishing and steal it.
            if let Some(voice) = self
                .voices
                .iter_mut()
                .max_by(|x, y| x.position.partial_cmp(&y.position).unwrap())
            {
                voice.active = true;
                voice.start_index = *start_index;
                voice.end_index = *end_index;
                voice.position = 0.0;
                voice.rate = self.rate;
            };
        }
    }

    fn set_active_segment(&mut self, segment: usize) {
        self.active_segment = segment;
    }
}

fn interpolate(samples: &[f32], x: f32) -> f32 {
    let n = samples.len() as f32 - 1.0;
    let f = x * n;
    let i = f as usize;
    let frac = f - i as f32;

    if i > 0 && i < samples.len() - 2 {
        let p0 = samples[i - 1];
        let p1 = samples[i];
        let p2 = samples[i + 1];
        let p3 = samples[i + 2];

        let a = -0.5 * p0 + 1.5 * p1 - 1.5 * p2 + 0.5 * p3;
        let b = p0 - 2.5 * p1 + 2.0 * p2 - 0.5 * p3;
        let c = -0.5 * p0 + 0.5 * p2;
        let d = p1;

        ((a * frac + b) * frac + c) * frac + d
    } else {
        interpolate_linear(samples, x)
    }
}

fn interpolate_linear(samples: &[f32], x: f32) -> f32 {
    let index = x * (samples.len() - 1) as f32;
    let left = samples[index.floor() as usize];
    let right = samples[index.ceil() as usize];
    let fraction = index.fract();
    left * (1.0 - fraction) + right * fraction
}

impl AudioModule for Sampler {
    type Event = SamplerEvent;
    type Command = SamplerCommand;
    type Param = SequencerParams;

    fn create(_initial_state: Option<Self::InitialState>, emitter: Emitter<Self::Event>) -> Self {
        let num_voices = 8;
        Sampler {
            segments: None,
            audio: None,
            clock_trigger: Default::default(),
            active_segment: 0,
            voices: vec![Voice::default(); num_voices],
            emitter,
            rate: 1.0,
        }
    }

    fn on_command(&mut self, command: Self::Command) {
        match command {
            SamplerCommand::ChangeAudio(ptr) => {
                unsafe {
                    self.audio = Some(SharedAudio::unpack(ptr));
                }
                self.segments = None;
                self.voices = vec![Voice::default(); self.voices.len()]
            }
            SamplerCommand::OnDetect(detections) => {
                self.segments = Some(detections.iter().cloned().map(|d| d as usize).collect());
                self.emitter.send(SamplerEvent::OnDetect(detections));
            }
            SamplerCommand::SetSample(sample) => self.set_active_segment(sample as usize),
        }
    }

    fn process(&mut self, buffer: &mut AudioBuffer, params: &ParamBuffer<Self::Param>) {
        if self.segments.is_none() || self.audio.is_none() {
            return;
        }

        let (inputs, outputs) = buffer.split();
        let rate_buffer = params.get(SequencerParams::Rate);

        let trigger_buffer = inputs.get(0).and_then(|i| i.channel(0)); // mono CV input
        let mut output_buffer = outputs.get_mut(0).and_then(|i| i.channel_mut(0)); // single mono output

        for i in 0..128 {
            if let Some(val) = trigger_buffer.and_then(|t| t.get(i)) {
                if self.clock_trigger.tick(*val, 0.0, 0.001) == Some(true) {
                    self.trigger();
                }
            }

            if let Some(rate) = rate_buffer.get(i) {
                self.rate = *rate
            }

            if let (Some(audio), Some(output)) = (
                self.audio.as_ref(),
                output_buffer.as_mut().and_then(|o| o.get_mut(i)),
            ) {
                let mut sample = 0.0;
                for voice in self.voices.iter_mut().filter(|voice| voice.active) {
                    let segment_start = voice.start_index;
                    let segment_end = voice.end_index;
                    let segment = &audio.data[segment_start..segment_end];
                    if voice.position >= 1.0 {
                        voice.active = false;
                    } else {
                        let level = {
                            // Fade in and out at constant of 50ms
                            let fade = (0.05 * audio.sample_rate) / segment.len() as f32;
                            if voice.position < fade {
                                let pos = voice.position / fade;
                                // Fade in from zero to declick audio playback
                                interpolate(&[0.0, 1.0], pos)
                            } else if voice.position > (1.0 - fade) {
                                let pos = (voice.position - (1.0 - fade)) / fade;
                                // Fade out from declick audio playback to zero
                                interpolate(&[1.0, 0.0], pos)
                            } else {
                                1.0
                            }
                        };
                        // Normal playback
                        sample += interpolate(segment, voice.position) * level;
                    }
                    voice.position += self.rate / segment.len() as f32;
                }
                *output = sample;
            }
        }
    }
}

waw::main!(Sampler);

struct GlobalSpecCache(Arc<RwLock<HashMap<String, Arc<Mutex<Vec<f32>>>>>>);

impl GlobalSpecCache {
    pub fn new() -> Self {
        Self(Arc::new(RwLock::new(HashMap::new())))
    }
}
impl Clone for GlobalSpecCache {
    fn clone(&self) -> Self {
        Self(self.0.clone())
    }
}

impl Deref for GlobalSpecCache {
    type Target = RwLock<HashMap<String, Arc<Mutex<Vec<f32>>>>>;

    fn deref(&self) -> &Self::Target {
        self.0.as_ref()
    }
}

thread_local! {
    static CACHE: GlobalSpecCache = GlobalSpecCache::new();
}

// Wrap the `SamplerNode` in a controller. This executes onset detection on the main thread
// when audio data is updated.
#[wasm_bindgen]
pub struct SamplerController {
    node: SamplerNode,
    audio: Option<SharedAudio>,
    spec_cache: GlobalSpecCache,
    threshold: f32,
}

const FPS: usize = 200;

#[wasm_bindgen]
impl SamplerController {
    pub async fn update_audio(&mut self, audio_data: SharedAudio) {
        let new_entry = match self.spec_cache.write().await.entry(audio_data.id.clone()) {
            Entry::Vacant(entry) => Some(entry.insert(Default::default())).cloned(),
            _ => None,
        };

        if let Some(entry) = new_entry {
            let worker_audio = audio_data.clone();
            let mut empty = entry.lock().await;

            let diff_spec = worker::run(move || {
                let mut spectrogram = Spectrogram::new(worker_audio.sample_rate, 2048, FPS, 24);

                // @todo - Find a sensible way to do processing incrementally, as to not block the main thread.
                let spec = spectrogram.process(&worker_audio.data);

                superflux_diff_spec(spec, 1, 3)
            })
            .await;

            *empty = diff_spec.unwrap();
        }

        self.audio = Some(audio_data.clone());

        self.node
            .command(SamplerCommand::ChangeAudio(audio_data.pack()));

        self.detect_peaks().await;
    }

    pub async fn set_threshold(&mut self, threshold: f32) {
        self.threshold = threshold;
        self.detect_peaks().await;
    }

    async fn detect_peaks(&mut self) {
        let spec_cache = self.spec_cache.read().await;
        if let Some(audio) = &self.audio {
            if let Some(diff_spec) = spec_cache.get(&audio.id) {
                let detections = onset(self.threshold, &diff_spec.lock().await);

                let mut segments: Vec<u32> = detections
                    .into_iter()
                    // @todo clean this up
                    //
                    .map(|frame_index| (frame_index as f32 * audio.sample_rate / FPS as f32) as u32)
                    .collect();

                segments.sort();

                // Send detections as sample indexes
                self.command(SamplerCommand::OnDetect(segments))
            }
        }
    }
}

// Forward the node interface onto the controller
// @todo - maybe this should be a trait + Derive macro?
#[wasm_bindgen]
impl SamplerController {
    pub async fn create(ctx: AudioContext) -> Result<SamplerController, JsValue> {
        let node = SamplerNode::create(ctx, None).await.unwrap();
        let spec_cache = CACHE.with(|cache| cache.clone());

        Ok(SamplerController {
            node,
            spec_cache,
            audio: None,
            threshold: 0.5,
        })
    }
    pub fn command(&self, message: <Sampler as AudioModule>::Command) {
        self.node.command(message)
    }
    pub fn node(&self) -> Result<AudioWorkletNode, JsValue> {
        self.node.node()
    }
    pub fn subscribe(&mut self, callback: Callback<<Sampler as AudioModule>::Event>) {
        self.node.subscribe(callback)
    }
    pub fn get_param(&self, param: <Sampler as AudioModule>::Param) -> AudioParam {
        self.node.get_param(param)
    }
    pub fn destroy(&mut self) {
        self.node.destroy()
    }
}
