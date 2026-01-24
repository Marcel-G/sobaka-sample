use fundsp::Float;

/// Convert 1v per octave to hz
/// 
/// Uses the 1V/Oct standard where:
/// - 0V = C0 (16.35 Hz)
/// - 1V = C1 (32.70 Hz)
/// - etc.
/// 
/// Guards against NaN and infinite inputs by returning a safe default.
pub fn volt_hz<T: Float>(voltage: T) -> T {
    let v = voltage.to_f64();
    
    // Guard against NaN and Infinity
    if v.is_nan() || v.is_infinite() {
        // Return A4 (440 Hz) as a safe default
        return T::from_f64(440.0);
    }
    
    // Clamp voltage to reasonable range to prevent extreme frequencies
    // -2V to 12V gives roughly 4 Hz to 65 kHz
    let clamped = v.clamp(-2.0, 12.0);
    
    T::from_f64(16.35 * 2.0_f64.powf(clamped))
}

/// Sanitize a float value, returning a default if NaN or infinite
#[inline]
pub fn sanitize<T: Float>(value: T, default: T) -> T {
    let v = value.to_f64();
    if v.is_nan() || v.is_infinite() {
        default
    } else {
        value
    }
}

/// Clamp a value to a range, returning a default if NaN
#[inline]
pub fn safe_clamp<T: Float>(value: T, min: T, max: T, default: T) -> T {
    let v = value.to_f64();
    if v.is_nan() {
        default
    } else {
        T::from_f64(v.clamp(min.to_f64(), max.to_f64()))
    }
}
