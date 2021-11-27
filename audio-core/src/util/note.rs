pub fn midi_to_freq(note: u8) -> f32 {
	27.5 * 2f32.powf((note as f32 - 21.0) / 12.0)
}