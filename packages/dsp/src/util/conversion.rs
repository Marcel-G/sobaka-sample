use fundsp::Float;

/// Convert 1v per octave to hz
pub fn volt_hz<T: Float>(voltage: T) -> T {
    T::from_f64(16.35 * 2.0_f64.powf(voltage.to_f64()))
}
