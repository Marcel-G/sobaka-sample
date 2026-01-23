use fundsp::thingbuf::mpsc::{channel, Receiver, Sender};
use wasm_bindgen::{prelude::wasm_bindgen, JsValue};
use waw::{register, AutomationRate, ParameterDescriptor, ParameterValuesRef, Processor};

/// Maximum number of steps
pub const MAX_STEPS: usize = 16;
/// Gate high duration in samples (at 48kHz, ~5ms)
const GATE_SAMPLES: usize = 240;

/// Bjorklund's algorithm for computing Euclidean rhythms
/// Returns a pattern of booleans where true = trigger
fn compute_euclidean_pattern(steps: usize, fills: usize, rotation: usize) -> [bool; MAX_STEPS] {
    let mut pattern = [false; MAX_STEPS];
    
    if steps == 0 || fills == 0 {
        return pattern;
    }
    
    let fills = fills.min(steps);
    
    // Bjorklund's algorithm
    let mut counts = vec![0usize; steps];
    let mut remainders = vec![0usize; steps];
    
    let mut divisor = steps - fills;
    remainders[0] = fills;
    let mut level = 0;
    
    while remainders[level] > 1 {
        counts[level] = divisor / remainders[level];
        remainders[level + 1] = divisor % remainders[level];
        divisor = remainders[level];
        level += 1;
    }
    counts[level] = divisor;
    
    // Build the pattern
    fn build(level: i32, counts: &[usize], remainders: &[usize], pattern: &mut Vec<bool>) {
        if level == -1 {
            pattern.push(false);
        } else if level == -2 {
            pattern.push(true);
        } else {
            let l = level as usize;
            for _ in 0..counts[l] {
                build(level - 1, counts, remainders, pattern);
            }
            if remainders[l] != 0 {
                build(level - 2, counts, remainders, pattern);
            }
        }
    }
    
    let mut result = Vec::with_capacity(steps);
    build(level as i32, &counts, &remainders, &mut result);
    
    // Apply rotation and copy to fixed array
    for i in 0..steps.min(MAX_STEPS) {
        let rotated_idx = (i + rotation) % steps;
        pattern[i] = result.get(rotated_idx).copied().unwrap_or(false);
    }
    
    pattern
}

/// Event sent from processor to main thread
#[wasm_bindgen]
#[derive(Clone, Copy, Debug, Default)]
pub struct StepEvent {
    pub step: u8,
    pub triggered: bool,
}

pub struct EuclideanData {
    pub sender: Sender<StepEvent>,
}

pub struct EuclideanProcessor {
    steps: usize,
    fills: usize,
    rotation: usize,
    current_step: usize,
    pattern: [bool; MAX_STEPS],
    gate_counter: usize,
    last_clock: f32,
    last_reset: f32,
    clock_threshold: f32,
    sender: Sender<StepEvent>,
}

impl EuclideanProcessor {
    fn update_pattern(&mut self) {
        self.pattern = compute_euclidean_pattern(self.steps, self.fills, self.rotation);
    }
    
    fn advance(&mut self) -> bool {
        if self.steps == 0 {
            return false;
        }
        self.current_step = (self.current_step + 1) % self.steps;
        let trigger = self.pattern[self.current_step];
        if trigger {
            self.gate_counter = GATE_SAMPLES;
        }
        trigger
    }
    
    fn reset(&mut self) {
        self.current_step = 0;
        self.gate_counter = 0;
    }
}

impl Processor for EuclideanProcessor {
    type Data = EuclideanData;

    fn new(data: Self::Data) -> Self {
        let steps = 8;
        let fills = 3;
        let rotation = 0;
        
        Self {
            steps,
            fills,
            rotation,
            current_step: 0,
            pattern: compute_euclidean_pattern(steps, fills, rotation),
            gate_counter: 0,
            last_clock: -1.0,
            last_reset: -1.0,
            clock_threshold: 0.0,
            sender: data.sender,
        }
    }

    fn process(
        &mut self,
        inputs: &[&[f32]],
        outputs: &mut [&mut [f32]],
        _sample_rate: f32,
        params: &ParameterValuesRef,
    ) {
        // Get clock and reset inputs
        let clock_input = inputs.get(0).copied().unwrap_or(&[]);
        let reset_input = inputs.get(1).copied().unwrap_or(&[]);
        
        // Update parameters
        let mut needs_update = false;
        
        if let Some(steps) = params.get("steps").and_then(|b| b.get(0)) {
            let new_steps = (*steps as usize).clamp(1, MAX_STEPS);
            if self.steps != new_steps {
                self.steps = new_steps;
                needs_update = true;
            }
        }
        
        if let Some(fills) = params.get("fills").and_then(|b| b.get(0)) {
            let new_fills = (*fills as usize).clamp(0, self.steps);
            if self.fills != new_fills {
                self.fills = new_fills;
                needs_update = true;
            }
        }
        
        if let Some(rotation) = params.get("rotation").and_then(|b| b.get(0)) {
            let new_rotation = (*rotation as usize) % self.steps.max(1);
            if self.rotation != new_rotation {
                self.rotation = new_rotation;
                needs_update = true;
            }
        }
        
        if needs_update {
            self.update_pattern();
        }
        
        // Process sample by sample
        let num_samples = clock_input.len().max(128);
        
        for i in 0..num_samples {
            // Check for reset rising edge
            let reset_val = reset_input.get(i).copied().unwrap_or(-1.0);
            if self.last_reset < self.clock_threshold && reset_val >= self.clock_threshold {
                self.reset();
                // Send reset event
                let _ = self.sender.try_send(StepEvent {
                    step: self.current_step as u8,
                    triggered: self.pattern[self.current_step],
                });
            }
            self.last_reset = reset_val;
            
            // Check for clock rising edge
            let clock_val = clock_input.get(i).copied().unwrap_or(-1.0);
            if self.last_clock < self.clock_threshold && clock_val >= self.clock_threshold {
                let triggered = self.advance();
                // Send step event
                let _ = self.sender.try_send(StepEvent {
                    step: self.current_step as u8,
                    triggered,
                });
            }
            self.last_clock = clock_val;
            
            // Generate gate output
            if let Some(output) = outputs.get_mut(0) {
                if let Some(sample) = output.get_mut(i) {
                    if self.gate_counter > 0 {
                        *sample = 1.0;
                        self.gate_counter -= 1;
                    } else {
                        *sample = -1.0;
                    }
                }
            }
        }
    }

    fn parameter_descriptors() -> Vec<ParameterDescriptor> {
        vec![
            ParameterDescriptor {
                name: "steps".to_string(),
                default_value: 8.0,
                min_value: 1.0,
                max_value: MAX_STEPS as f32,
                automation_rate: AutomationRate::KRate,
            },
            ParameterDescriptor {
                name: "fills".to_string(),
                default_value: 3.0,
                min_value: 0.0,
                max_value: MAX_STEPS as f32,
                automation_rate: AutomationRate::KRate,
            },
            ParameterDescriptor {
                name: "rotation".to_string(),
                default_value: 0.0,
                min_value: 0.0,
                max_value: (MAX_STEPS - 1) as f32,
                automation_rate: AutomationRate::KRate,
            },
        ]
    }
}

#[wasm_bindgen]
pub struct EuclideanNode {
    wrapper: waw::AudioWorkletNodeWrapper,
    receiver: Receiver<StepEvent>,
}

#[wasm_bindgen]
impl EuclideanNode {
    #[wasm_bindgen(constructor)]
    pub fn new(ctx: &web_sys::AudioContext) -> Result<EuclideanNode, JsValue> {
        let options = web_sys::AudioWorkletNodeOptions::new();
        options.set_channel_count(1);
        options.set_number_of_inputs(2); // clock, reset
        options.set_number_of_outputs(1); // single trigger output
        
        // Create channel for step events
        let (sender, receiver) = channel(128);
        let data = EuclideanData { sender };
        
        let wrapper = EuclideanProcessor::create_node(ctx, data, Some(&options))?;
        
        Ok(EuclideanNode { wrapper, receiver })
    }

    #[wasm_bindgen(getter)]
    pub fn node(&self) -> web_sys::AudioWorkletNode {
        self.wrapper.node().clone()
    }

    /// Poll for step events from the processor
    #[wasm_bindgen(js_name = "pollEvent")]
    pub fn poll_event(&self) -> Option<StepEvent> {
        self.receiver.try_recv().ok()
    }
}

register!(EuclideanProcessor, "euclidean");

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_euclidean_patterns() {
        // E(3,8) = [x . . x . . x .]
        let pattern = compute_euclidean_pattern(8, 3, 0);
        assert_eq!(&pattern[..8], &[true, false, false, true, false, false, true, false]);
        
        // E(5,8) = [x . x x . x x .]
        let pattern = compute_euclidean_pattern(8, 5, 0);
        let hits: usize = pattern[..8].iter().filter(|&&b| b).count();
        assert_eq!(hits, 5);
        
        // E(4,16) should be evenly spaced
        let pattern = compute_euclidean_pattern(16, 4, 0);
        let hits: usize = pattern[..16].iter().filter(|&&b| b).count();
        assert_eq!(hits, 4);
    }

    #[test]
    fn test_rotation() {
        let pattern_0 = compute_euclidean_pattern(8, 3, 0);
        let pattern_1 = compute_euclidean_pattern(8, 3, 1);
        
        // Rotation should shift the pattern
        for i in 0..8 {
            assert_eq!(pattern_0[i], pattern_1[(i + 1) % 8]);
        }
    }
}
