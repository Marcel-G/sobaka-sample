/// Debug utilities for audio processing
/// Only compiled when the `debug-audio` feature is enabled

#[cfg(feature = "debug-audio")]
use web_sys::console;

/// Log audio buffer statistics to the browser console
/// Only logs when the `debug-audio` feature is enabled
#[allow(unused_variables)]
pub fn log_buffer_stats(name: &str, outputs: &[&mut [f32]]) {
    #[cfg(feature = "debug-audio")]
    {
        for (i, channel) in outputs.iter().enumerate() {
            if !channel.is_empty() {
                let min = channel.iter().copied().fold(f32::INFINITY, f32::min);
                let max = channel.iter().copied().fold(f32::NEG_INFINITY, f32::max);
                let avg = channel.iter().sum::<f32>() / channel.len() as f32;
                console::log_1(
                    &format!(
                        "{} Ch{}: min={:.4}, max={:.4}, avg={:.4}, len={}",
                        name,
                        i,
                        min,
                        max,
                        avg,
                        channel.len()
                    )
                    .into(),
                );
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
