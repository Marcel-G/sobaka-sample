use fundsp::Float;

pub mod hold;
pub mod join;
pub mod messaging;
pub mod midi;
pub mod oscillator;
pub mod param;
pub mod pluck;
pub mod quantiser;
pub mod scope;
pub mod shared;
pub mod stepped;
pub mod trigger;
pub mod envelope;
pub mod player;

/// Convert 1v per octave to hz
pub fn volt_hz<T: Float>(voltage: T) -> T {
    T::from_f64(16.35 * 2.0_f64.powf(voltage.to_f64()))
}

// Midi note to CV
pub fn midi_volt<T: Float>(pitch: u8) -> T {
    T::from_f64(pitch as f64 / 12.0)
}
