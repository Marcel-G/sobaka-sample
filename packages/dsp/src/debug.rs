/// Debug utilities for audio processing
/// 
/// This module provides comprehensive audio debugging tools:
/// - NaN/Infinity detection in audio buffers
/// - Configurable logging levels
/// - Buffer statistics and sample inspection
/// 
/// Feature flags:
/// - `debug-audio`: Enable verbose logging (compile-time)
/// 
/// Runtime detection always runs but only logs when issues are found.

#[cfg(feature = "debug-audio")]
use web_sys::console;

/// Result of analyzing an audio buffer for issues
#[derive(Debug, Clone)]
pub struct BufferAnalysis {
    pub has_nan: bool,
    pub has_infinity: bool,
    pub nan_count: usize,
    pub inf_count: usize,
    pub first_nan_index: Option<usize>,
    pub first_inf_index: Option<usize>,
    pub min: f32,
    pub max: f32,
    pub avg: f32,
}

impl BufferAnalysis {
    /// Returns true if the buffer contains any problematic values
    pub fn has_issues(&self) -> bool {
        self.has_nan || self.has_infinity
    }
}

/// Analyze an audio buffer for NaN, Infinity, and compute statistics
pub fn analyze_buffer(buffer: &[f32]) -> BufferAnalysis {
    let mut has_nan = false;
    let mut has_infinity = false;
    let mut nan_count = 0;
    let mut inf_count = 0;
    let mut first_nan_index = None;
    let mut first_inf_index = None;
    let mut min = f32::INFINITY;
    let mut max = f32::NEG_INFINITY;
    let mut sum = 0.0f32;
    let mut valid_count = 0usize;

    for (i, &sample) in buffer.iter().enumerate() {
        if sample.is_nan() {
            has_nan = true;
            nan_count += 1;
            if first_nan_index.is_none() {
                first_nan_index = Some(i);
            }
        } else if sample.is_infinite() {
            has_infinity = true;
            inf_count += 1;
            if first_inf_index.is_none() {
                first_inf_index = Some(i);
            }
        } else {
            min = min.min(sample);
            max = max.max(sample);
            sum += sample;
            valid_count += 1;
        }
    }

    let avg = if valid_count > 0 { sum / valid_count as f32 } else { 0.0 };

    BufferAnalysis {
        has_nan,
        has_infinity,
        nan_count,
        inf_count,
        first_nan_index,
        first_inf_index,
        min: if min == f32::INFINITY { 0.0 } else { min },
        max: if max == f32::NEG_INFINITY { 0.0 } else { max },
        avg,
    }
}

/// Check buffers for NaN/Infinity and log warnings if found
/// This always runs (no feature flag) to catch issues in production
#[allow(unused_variables)]
pub fn check_buffer_issues(name: &str, outputs: &[&mut [f32]]) -> bool {
    let mut found_issues = false;
    
    for (i, channel) in outputs.iter().enumerate() {
        let analysis = analyze_buffer(channel);
        if analysis.has_issues() {
            found_issues = true;
            #[cfg(feature = "debug-audio")]
            {
                let msg = format!(
                    "[AUDIO ERROR] {} Ch{}: {} NaN values (first at {:?}), {} Infinity values (first at {:?})",
                    name, i,
                    analysis.nan_count, analysis.first_nan_index,
                    analysis.inf_count, analysis.first_inf_index
                );
                console::error_1(&msg.into());
            }
        }
    }
    
    found_issues
}

/// Sanitize a buffer by replacing NaN and Infinity with zero
/// Returns true if any values were replaced
pub fn sanitize_buffer(buffer: &mut [f32]) -> bool {
    let mut replaced = false;
    for sample in buffer.iter_mut() {
        if sample.is_nan() || sample.is_infinite() {
            *sample = 0.0;
            replaced = true;
        }
    }
    replaced
}

/// Sanitize multiple output buffers
/// Returns true if any values were replaced
pub fn sanitize_outputs(outputs: &mut [&mut [f32]]) -> bool {
    let mut replaced = false;
    for channel in outputs.iter_mut() {
        if sanitize_buffer(channel) {
            replaced = true;
        }
    }
    replaced
}

/// Sanitize a single f32 value, returning a safe default if invalid
#[inline]
pub fn sanitize_value(value: f32, default: f32) -> f32 {
    if value.is_nan() || value.is_infinite() {
        default
    } else {
        value
    }
}

/// Clamp a value to a range, handling NaN by returning the default
#[inline]
pub fn safe_clamp(value: f32, min: f32, max: f32, default: f32) -> f32 {
    if value.is_nan() {
        default
    } else {
        value.clamp(min, max)
    }
}

/// Log audio buffer statistics to the browser console
/// Only logs when the `debug-audio` feature is enabled
#[allow(unused_variables)]
pub fn log_buffer_stats(name: &str, outputs: &[&mut [f32]]) {
    #[cfg(feature = "debug-audio")]
    {
        for (i, channel) in outputs.iter().enumerate() {
            if !channel.is_empty() {
                let analysis = analyze_buffer(channel);
                let mut msg = format!(
                    "{} Ch{}: min={:.4}, max={:.4}, avg={:.4}, len={}",
                    name, i,
                    analysis.min, analysis.max, analysis.avg,
                    channel.len()
                );
                
                if analysis.has_issues() {
                    msg.push_str(&format!(
                        " [!ISSUES: {} NaN, {} Inf]",
                        analysis.nan_count, analysis.inf_count
                    ));
                }
                
                console::log_1(&msg.into());
            }
        }
    }
}

/// Log a simple message to the browser console
/// Only logs when the `debug-audio` feature is enabled
#[allow(unused_variables)]
pub fn log(message: &str) {
    #[cfg(feature = "debug-audio")]
    {
        console::log_1(&message.into());
    }
}

/// Log a warning message (always logs when feature is enabled)
#[allow(unused_variables)]
pub fn warn(message: &str) {
    #[cfg(feature = "debug-audio")]
    {
        console::warn_1(&message.into());
    }
}

/// Log an error message (always logs when feature is enabled)
#[allow(unused_variables)]
pub fn error(message: &str) {
    #[cfg(feature = "debug-audio")]
    {
        console::error_1(&message.into());
    }
}

/// Log audio buffer with first N samples
/// Only logs when the `debug-audio` feature is enabled
#[allow(unused_variables)]
pub fn log_buffer_samples(name: &str, outputs: &[&mut [f32]], num_samples: usize) {
    #[cfg(feature = "debug-audio")]
    {
        for (i, channel) in outputs.iter().enumerate() {
            let samples: Vec<f32> = channel.iter().take(num_samples).copied().collect();
            console::log_1(&format!("{} Ch{}: {:?}", name, i, samples).into());
        }
    }
}

/// Log parameter value with NaN/Infinity detection
#[allow(unused_variables)]
pub fn log_param(name: &str, param_name: &str, value: f32) {
    #[cfg(feature = "debug-audio")]
    {
        if value.is_nan() {
            console::error_1(&format!("[PARAM ERROR] {} {}: NaN!", name, param_name).into());
        } else if value.is_infinite() {
            console::error_1(&format!("[PARAM ERROR] {} {}: Infinity!", name, param_name).into());
        } else {
            console::log_1(&format!("{} {}: {:.4}", name, param_name, value).into());
        }
    }
}
