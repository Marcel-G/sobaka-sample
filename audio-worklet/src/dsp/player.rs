use std::{sync::Arc, marker::PhantomData};

use fundsp::prelude::*;

/// Play back one channel of a wave.
pub struct Wave32Player<T: Float> {
    wave: Arc<Wave32>,
    channel: usize,
    index: usize,
    loop_point: Option<usize>,
    _marker: PhantomData<T>,
}

impl<T: Float> Wave32Player<T> {
    pub fn new(wave: Arc<Wave32>, channel: usize, loop_point: Option<usize>) -> Self {
        Self {
            wave,
            channel,
            index: 0,
            loop_point,
            _marker: PhantomData::default(),
        }
    }

    // @todo cleanup & fix naming
    pub fn set_data(&mut self, data: &[f32], sample_rate: f32) {
        let mut wave = Wave32::new(1, sample_rate.into());
        self.index = 0;

        wave.resize(data.len());
        for (i, v) in wave.channel_mut(0).iter_mut().enumerate() {
            *v = data[i];
        }

        self.wave = Arc::new(wave);
    }
}

impl<T: Float> AudioNode for Wave32Player<T> {
    const ID: u64 = 65;
    type Sample = T;
    type Inputs = U0;
    type Outputs = U1;

    fn reset(&mut self, _sample_rate: Option<f64>) {
        self.index = 0;
    }

    #[inline]
    fn tick(
        &mut self,
        _input: &Frame<Self::Sample, Self::Inputs>,
    ) -> Frame<Self::Sample, Self::Outputs> {
        if self.index < self.wave.length() {
            let value = self.wave.at(self.channel, self.index);
            self.index += 1;
            if self.index == self.wave.length() {
                if let Some(point) = self.loop_point {
                    self.index = point;
                }
            }
            [convert(value)].into()
        } else {
            [T::zero()].into()
        }
    }
}

/// Play back a channel of a Wave32.
/// Optional loop point is the index to jump to at the end of the wave.
/// - Output 0: wave
pub fn player<T: Float>(
  channel: usize,
  loop_point: Option<usize>,
) -> An<Wave32Player<T>> {
  An(Wave32Player::new(Arc::new(Wave32::new(1, DEFAULT_SR)), channel, loop_point))
}
