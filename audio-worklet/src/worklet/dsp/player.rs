use std::{marker::PhantomData, sync::Arc};

use fundsp::prelude::*;
use rand::Rng;

/// Play back one channel of a wave.
pub struct Wave32Player<T: Float> {
    wave: Arc<Wave32>,
    sample: usize,
    channel: usize,
    index: usize,
    callback: Option<Box<dyn Fn(PlayerEvent)>>,
    detections: Vec<u32>,
    _marker: PhantomData<T>,
}

impl<T: Float> Wave32Player<T> {
    pub fn new(
        wave: Arc<Wave32>,
        channel: usize,
        callback: Option<Box<dyn Fn(PlayerEvent)>>,
    ) -> Self {
        Self {
            wave,
            channel,
            callback,
            sample: 0,
            index: 0,
            detections: Default::default(),
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

    pub fn set_detections(&mut self, detections: &[u32]) {
        self.sample = 0;
        self.index = 0;
        self.detections = detections.to_vec();
    }

    fn notify(&self, event: PlayerEvent) {
        if let Some(callback) = &self.callback {
            (callback)(event)
        }
    }
}

#[derive(Clone)]
pub enum PlayerEvent {
    OnTrigger(usize),
}

impl<T: Float> AudioNode for Wave32Player<T> {
    const ID: u64 = 65;
    type Sample = T;
    type Inputs = U0;
    type Outputs = U1;

    fn reset(&mut self, _sample_rate: Option<f64>) {
        if !self.detections.is_empty() {
            let mut rng = rand::thread_rng();
            self.sample = rng.gen_range(0..self.detections.len() - 1);

            self.notify(PlayerEvent::OnTrigger(self.sample))
        }
        self.index = 0;
    }

    #[inline]
    fn tick(
        &mut self,
        _input: &Frame<Self::Sample, Self::Inputs>,
    ) -> Frame<Self::Sample, Self::Outputs> {
        let wave = {
            if !self.detections.is_empty() {
                let start = self.detections[self.sample] as usize;
                let end = self.detections[self.sample + 1] as usize;
                &self.wave.channel(self.channel)[start..end]
            } else {
                self.wave.channel(self.channel)
            }
        };

        if self.index < wave.len() {
            let value = wave[self.index];
            self.index += 1;
            if self.index == wave.len() {
                // @todo go back to the start of the segment
                // if let Some(point) = self.loop_point {
                //     self.index = point;
                // }
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
pub fn dsp_player<T: Float>(
    channel: usize,
    callback: Option<Box<dyn Fn(PlayerEvent)>>,
) -> An<Wave32Player<T>> {
    An(Wave32Player::new(
        Arc::new(Wave32::new(1, DEFAULT_SR)),
        channel,
        callback,
    ))
}
