use fundsp::prelude::*;

#[derive(Default, Clone)]
pub struct Quantiser([i32; 24]);

impl Quantiser {
    pub fn new(notes: [bool; 12]) -> Self {
        Self(Self::create_ranges(notes))
    }

    fn create_ranges(notes: [bool; 12]) -> [i32; 24] {
        let mut ranges = [0; 24];

        for (i, range) in ranges.iter_mut().enumerate() {
            let mut closest_note = 0;
            let mut closest_dist = i32::MAX;

            for note in -12..24 {
                let dist = ((i as i32 + 1) / 2 - note).abs();
                if !notes[(note % 12).unsigned_abs() as usize] {
                    continue;
                }
                if dist < closest_dist {
                    closest_note = note;
                    closest_dist = dist;
                } else {
                    break;
                }
            }

            *range = closest_note;
        }
        ranges
    }
}

impl AudioNode for Quantiser {
    const ID: u64 = 0;

    type Sample = f32;

    type Inputs = U1;

    type Outputs = U1;
    type Setting = [bool; 12];

    fn tick(
        &mut self,
        input: &fundsp::hacker::Frame<Self::Sample, Self::Inputs>,
    ) -> fundsp::hacker::Frame<Self::Sample, Self::Outputs> {
        let range = (input[0] * 24.0).floor() as usize;
        let octave = range / 24;
        let index = range - octave * 24;
        let note = self.0[index] + octave as i32 * 12;
        Frame::splat(note as f32 / 12.0)
    }

    fn set(&mut self, notes: Self::Setting) {
        self.0 = Self::create_ranges(notes);
    }
}

/// Quantiser
/// - Input 0: Input signal (1v per octave note).
/// - Output 0: Quantised signal.
#[inline]
pub fn dsp_quantiser(notes: [bool; 12]) -> An<Quantiser> {
    An(Quantiser::new(notes))
}
