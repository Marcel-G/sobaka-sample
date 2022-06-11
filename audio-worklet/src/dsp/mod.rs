use fundsp::Float;

pub mod messaging;
pub mod param;
pub mod shared;
pub mod stepped;
pub mod trigger;

/// Convert 1v per octave to hz
pub fn volt_hz<T: Float>(voltage: T) -> T {
    T::from_f64(16.35 * 2.0_f64.powf(voltage.to_f64()))
}