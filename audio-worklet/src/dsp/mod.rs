use fundsp::{Float};

pub mod param;
pub mod stepped;
pub mod trigger;
pub mod messaging;

/// Convert 1v per octave to hz
pub fn volt_hz<T: Float>(voltage: T) -> T {
    T::from_f64(16.35 * 2.0_f64.powf(voltage.to_f64()))
}
