use fundsp::prelude::*;
use numeric_array::typenum::Prod;
use std::ops::Mul;

use super::midi_volt;

/// Midi adapter.
/// - Output 0: Gate output.
/// - Output 1: Pitch output.
#[derive(Default)]
pub struct MidiAdapter<N: Size<T> + Size<usize>, T: Real> {
    next: usize,
    notes: Frame<T, N>,
    gates: Frame<T, N>,
}

impl<N: Size<T> + Size<usize>, T: Real> MidiAdapter<N, T> {
    pub fn new() -> Self {
        Self {
            next: 0,
            notes: Frame::splat(T::zero()),
            gates: Frame::splat(T::zero()),
        }
    }
    pub fn note_on(&mut self, note: u8) {
        // @todo new notes should not effect already open ones
        self.notes[self.next] = midi_volt(note);
        self.gates[self.next] = T::one();

        if self.next >= N::USIZE - 1 {
            self.next = 0;
        } else {
            self.next += 1;
        }
    }

    pub fn note_off(&mut self, note: u8) {
        if let Some(pos) = self.notes.iter().position(|n| *n == midi_volt(note)) {
            self.gates[pos] = T::zero();
            // self.notes[pos] = T::zero(); // @todo maybe note should hang on longer after gate
        }
    }
}

impl<N: Size<T> + Size<usize>, T: Real> AudioNode for MidiAdapter<N, T>
where
    N: Mul<U2>,
    <N as Mul<U2>>::Output: Size<T>,
{
    const ID: u64 = 0;
    type Sample = T;
    type Inputs = U0;
    type Outputs = Prod<N, U2>;

    fn tick(
        &mut self,
        _input: &Frame<Self::Sample, Self::Inputs>,
    ) -> Frame<Self::Sample, Self::Outputs> {
        Frame::generate(|i| {
            if i < N::USIZE {
                self.gates[i]
            } else {
                self.notes[i - N::USIZE]
            }
        }) // @todo maybe there is a way to concatenate the two frames?
    }
}

/// Midi adapter to gate and pitch (polyphonic)
/// - Output 0-N: Gate outputs
/// - Output N-2N: Pitch outputs
#[inline]
pub fn midi_poly<N: Size<T> + Size<usize>, T: Real>() -> An<MidiAdapter<N, T>>
where
    N: Mul<U2>,
    <N as Mul<U2>>::Output: Size<T>,
{
    An(MidiAdapter::new())
}
