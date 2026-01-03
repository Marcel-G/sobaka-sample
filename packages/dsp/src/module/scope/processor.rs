use rustfft::{FftPlanner, num_complex::Complex};
use wasm_bindgen::{prelude::wasm_bindgen, JsValue};
use waw::{register, ParameterDescriptor, ParameterValuesRef, Processor};
use std::sync::Arc;
use std::cell::UnsafeCell;

const BUFFER_SIZE: usize = 4096;  // Increased for better resolution
const FFT_SIZE: usize = 16384;    // Very large FFT for excellent low-frequency resolution
const NUM_CHANNELS: usize = 4;

// Use UnsafeCell wrapped in Arc for shared mutable access
// This is safe in WASM because it's single-threaded
#[derive(Clone)]
pub struct ScopeData {
    waveform_buffers: [Vec<f32>; NUM_CHANNELS],
    spectrum_buffer: Vec<f32>,
}

impl Default for ScopeData {
    fn default() -> Self {
        Self {
            waveform_buffers: [
                vec![0.0; BUFFER_SIZE],
                vec![0.0; BUFFER_SIZE],
                vec![0.0; BUFFER_SIZE],
                vec![0.0; BUFFER_SIZE],
            ],
            spectrum_buffer: vec![0.0; FFT_SIZE / 2],
        }
    }
}

// Wrapper to make UnsafeCell Send (safe in single-threaded WASM)
pub struct SendUnsafeCell<T>(UnsafeCell<T>);
unsafe impl<T> Send for SendUnsafeCell<T> {}
unsafe impl<T> Sync for SendUnsafeCell<T> {}

impl<T> SendUnsafeCell<T> {
    fn new(value: T) -> Self {
        SendUnsafeCell(UnsafeCell::new(value))
    }
    
    unsafe fn get(&self) -> &mut T {
        &mut *self.0.get()
    }
}

pub struct ScopeProcessor {
    // Waveform buffers for each channel
    waveform_buffers: [Vec<f32>; NUM_CHANNELS],
    waveform_write_pos: usize,
    
    // FFT buffers
    fft_input_buffer: Vec<f32>,
    fft_write_pos: usize,
    fft_planner: FftPlanner<f32>,
    
    // Trigger state for waveform capture
    trigger_threshold: f32,
    last_sample: f32,
    triggered: bool,
    
    // Time scale control (how many samples to skip between captures)
    time_scale: usize,
    sample_counter: usize,
    
    // Zoom control (how many samples to capture total)
    zoom_factor: f32,
    target_samples: usize,
    
    // Shared data for reading from main thread
    shared_data: Arc<SendUnsafeCell<ScopeData>>,
    frame_counter: usize,
}

impl Processor for ScopeProcessor {
    type Data = Arc<SendUnsafeCell<ScopeData>>;

    fn new(data: Self::Data) -> Self {
        Self {
            waveform_buffers: [
                vec![0.0; BUFFER_SIZE],
                vec![0.0; BUFFER_SIZE],
                vec![0.0; BUFFER_SIZE],
                vec![0.0; BUFFER_SIZE],
            ],
            waveform_write_pos: 0,
            fft_input_buffer: vec![0.0; FFT_SIZE],
            fft_write_pos: 0,
            fft_planner: FftPlanner::new(),
            trigger_threshold: 0.0,
            last_sample: 0.0,
            triggered: false,
            time_scale: 1,
            sample_counter: 0,
            zoom_factor: 1.0,
            target_samples: BUFFER_SIZE,
            shared_data: data,
            frame_counter: 0,
        }
    }

    fn process(
        &mut self,
        inputs: &[&[f32]],
        _outputs: &mut [&mut [f32]],
        sample_rate: f32,
        params: &ParameterValuesRef,
    ) {
        // Update threshold from parameter
        if let Some(threshold_buffer) = params.get("threshold") {
            if let Some(&threshold) = threshold_buffer.get(0) {
                self.trigger_threshold = threshold;
            }
        }
        
        // Update zoom from parameter (zoom factor: 1.0 = baseline)
        if let Some(zoom_buffer) = params.get("timeScale") {
            if let Some(&zoom_factor) = zoom_buffer.get(0) {
                self.zoom_factor = zoom_factor;
                
                // Zoom factor determines how much time we display:
                // - zoom = 1.0: baseline view (~85ms at 48kHz, BUFFER_SIZE samples)
                // - zoom = 2.0: zoomed in 2x (show HALF the time = ~42ms, capture HALF the samples)
                // - zoom = 0.5: zoomed out 2x (show DOUBLE the time = ~170ms, capture with decimation)
                //
                // When zoomed IN: capture fewer samples (shorter time window)
                // When zoomed OUT: capture more samples via decimation (longer time window)
                //
                // Examples at 48kHz (BUFFER_SIZE = 4096 = ~85ms):
                // - zoom 0.1: show 850ms, target=4096, time_scale=10 (every 10th of 40960 samples)
                // - zoom 0.5: show 170ms, target=4096, time_scale=2 (every 2nd of 8192 samples)
                // - zoom 1.0: show 85ms, target=4096, time_scale=1 (all 4096 samples)
                // - zoom 2.0: show 42ms, target=2048, time_scale=1 (2048 samples)
                // - zoom 10.0: show 8.5ms, target=410, time_scale=1 (410 samples)
                
                if zoom_factor >= 1.0 {
                    // Zoomed in: capture fewer samples (shorter time)
                    self.target_samples = ((BUFFER_SIZE as f32) / zoom_factor) as usize;
                    self.time_scale = 1;
                } else {
                    // Zoomed out: decimate to show longer time window
                    self.target_samples = BUFFER_SIZE;
                    self.time_scale = (1.0 / zoom_factor) as usize;
                }
            }
        }
        // Process all channels sample by sample to keep them in sync
        let num_samples = inputs.get(0).map(|ch| ch.len()).unwrap_or(0);
        
        for sample_idx in 0..num_samples {
            // Check for trigger on first channel
            if let Some(first_channel) = inputs.get(0) {
                if let Some(&sample) = first_channel.get(sample_idx) {
                    if !self.triggered 
                        && self.last_sample < self.trigger_threshold 
                        && sample >= self.trigger_threshold 
                    {
                        // Trigger detected - reset write position
                        self.triggered = true;
                        self.waveform_write_pos = 0;
                        self.sample_counter = 0;
                    }
                    self.last_sample = sample;
                    
                    // Increment sample counter when triggered
                    if self.triggered {
                        self.sample_counter += 1;
                    }
                    
                    // Always collect samples for FFT from first channel
                    self.fft_input_buffer[self.fft_write_pos] = sample;
                    self.fft_write_pos = (self.fft_write_pos + 1) % FFT_SIZE;
                }
            }

            // Write to waveform buffer if triggered (with time scaling/decimation)
            if self.triggered && self.waveform_write_pos < self.target_samples {
                // Only write every Nth sample based on time_scale (decimation factor)
                // When time_scale = 1, write every sample
                // When time_scale = 2, write every 2nd sample, etc.
                if (self.sample_counter - 1) % self.time_scale == 0 {
                    // Write all channels at the same position
                    for (channel_idx, input_channel) in inputs.iter().enumerate() {
                        if channel_idx >= NUM_CHANNELS {
                            break;
                        }
                        if let Some(&sample) = input_channel.get(sample_idx) {
                            self.waveform_buffers[channel_idx][self.waveform_write_pos] = sample;
                        }
                    }
                    
                    // Advance write position
                    self.waveform_write_pos += 1;
                    if self.waveform_write_pos >= self.target_samples {
                        self.triggered = false;
                    }
                }
            }
        }
        
        // Update shared data every 4 frames (~11ms at 48kHz)
        self.frame_counter += 1;
        if self.frame_counter >= 4 {
            self.frame_counter = 0;
            self.update_shared_data();
        }
    }

    fn parameter_descriptors() -> Vec<ParameterDescriptor> {
        vec![
            ParameterDescriptor {
                name: "threshold".to_string(),
                default_value: 0.0,
                min_value: -1.0,
                max_value: 1.0,
                automation_rate: waw::AutomationRate::KRate,
            },
            ParameterDescriptor {
                name: "timeScale".to_string(),
                default_value: 1.0,    // 1x zoom (baseline)
                min_value: 0.1,        // 0.1x (zoomed out 10x)
                max_value: 30.0,       // 30x (zoomed in 30x)
                automation_rate: waw::AutomationRate::KRate,
            },
        ]
    }
}

impl ScopeProcessor {
    fn update_shared_data(&mut self) {
        unsafe {
            let data = self.shared_data.get();
            
            // Copy waveform data (only the valid samples when zoomed in)
            for (i, buffer) in self.waveform_buffers.iter().enumerate() {
                // Copy valid samples
                data.waveform_buffers[i][..self.target_samples].copy_from_slice(&buffer[..self.target_samples]);
                
                // Clear the rest of the buffer when zoomed in (target_samples < BUFFER_SIZE)
                if self.target_samples < BUFFER_SIZE {
                    for j in self.target_samples..BUFFER_SIZE {
                        data.waveform_buffers[i][j] = 0.0;
                    }
                }
            }
            
            // Compute FFT
            let mut buffer: Vec<Complex<f32>> = self.fft_input_buffer
                .iter()
                .map(|&x| Complex::new(x, 0.0))
                .collect();

            let fft = self.fft_planner.plan_fft_forward(FFT_SIZE);
            fft.process(&mut buffer);

            // Calculate magnitudes with proper normalization and temporal smoothing
            const SMOOTHING: f32 = 0.85; // Higher = more smoothing (0.0 to 1.0)
            
            for (i, c) in buffer[0..FFT_SIZE / 2].iter().enumerate() {
                let magnitude = (c.re * c.re + c.im * c.im).sqrt();
                // Normalize by FFT size and convert to dB
                let normalized = magnitude / (FFT_SIZE as f32);
                // Convert to dB (reference: 1.0 = 0dB)
                let new_db = 20.0 * normalized.max(1e-10).log10();
                
                // Apply exponential smoothing to reduce jitter
                let old_db = data.spectrum_buffer[i];
                data.spectrum_buffer[i] = old_db * SMOOTHING + new_db * (1.0 - SMOOTHING);
            }
        }
    }
}

#[wasm_bindgen]
pub struct ScopeNode {
    wrapper: waw::AudioWorkletNodeWrapper,
    shared_data: Arc<SendUnsafeCell<ScopeData>>,
}

#[wasm_bindgen]
impl ScopeNode {
    #[wasm_bindgen(constructor)]
    pub fn new(ctx: &web_sys::AudioContext) -> Result<ScopeNode, JsValue> {
        let options = web_sys::AudioWorkletNodeOptions::new();
        options.set_channel_count(NUM_CHANNELS as u32);
        options.set_number_of_inputs(NUM_CHANNELS as u32);
        options.set_number_of_outputs(0);

        let shared_data = Arc::new(SendUnsafeCell::new(ScopeData::default()));
        let wrapper = ScopeProcessor::create_node(ctx, shared_data.clone(), Some(&options))?;
        
        Ok(ScopeNode { 
            wrapper,
            shared_data,
        })
    }

    #[wasm_bindgen(getter)]
    pub fn node(&self) -> web_sys::AudioWorkletNode {
        self.wrapper.node().clone()
    }

    /// Set the trigger threshold for waveform capture
    #[wasm_bindgen(js_name = setTriggerThreshold)]
    pub fn set_trigger_threshold(&self, _threshold: f32) {
        // TODO: Send message to processor to update threshold
    }

    /// Set the time scale (in milliseconds to display)
    /// This controls how much time is shown in the waveform display
    #[wasm_bindgen(js_name = setTimeScale)]
    pub fn set_time_scale(&self, _time_ms: f32) {
        // TODO: Send message to processor to update time scale
    }

    /// Get waveform data for a specific channel
    #[wasm_bindgen(js_name = getWaveformData)]
    pub fn get_waveform_data(&self, channel: usize) -> Vec<f32> {
        unsafe {
            let data = self.shared_data.get();
            if channel < NUM_CHANNELS {
                return data.waveform_buffers[channel].clone();
            }
        }
        vec![0.0; BUFFER_SIZE]
    }

    /// Get FFT spectrum data
    #[wasm_bindgen(js_name = getSpectrumData)]
    pub fn get_spectrum_data(&self) -> Vec<f32> {
        unsafe {
            let data = self.shared_data.get();
            data.spectrum_buffer.clone()
        }
    }

    /// Get the buffer size
    #[wasm_bindgen(js_name = getBufferSize)]
    pub fn get_buffer_size(&self) -> usize {
        BUFFER_SIZE
    }

    /// Get the FFT size
    #[wasm_bindgen(js_name = getFftSize)]
    pub fn get_fft_size(&self) -> usize {
        FFT_SIZE / 2
    }
}

register!(ScopeProcessor, "scope");
