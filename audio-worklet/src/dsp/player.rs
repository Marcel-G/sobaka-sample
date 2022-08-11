use std::{marker::PhantomData, sync::Arc};

use crate::utils::observer::{Observable, Observer, Producer, Subject};
use fundsp::prelude::*;
use rand::{Rng};

use super::onset::{onset, superflux_diff_spec, Spectrogram};

/// Play back one channel of a wave.
pub struct Wave32Player<T: Float> {
    wave: Arc<Wave32>,
    sample: usize,
    channel: usize,
    threshold: f32,
    diff_spec: Option<Vec<f32>>,
    index: usize,
    subject: Subject<PlayerEvent>,
    loop_point: Option<usize>,
    detections: Vec<usize>,
    _marker: PhantomData<T>,
}

impl<T: Float> Wave32Player<T> {
    pub fn new(wave: Arc<Wave32>, channel: usize, loop_point: Option<usize>, threshold: f32) -> Self {
        Self {
            wave,
            channel,
            sample: 0,
            index: 0,
            threshold,
            diff_spec: None,
            subject: Default::default(),
            loop_point,
            detections: Default::default(),
            _marker: PhantomData::default(),
        }
    }

    pub fn set_threshold(&mut self, threshold: f32) {
        self.threshold = threshold;
        self.sample = 0;
        self.detect_peaks();
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


        // @todo do this in a seperate task
        // and clean up this messy interface
        let fps = 200;
        let mut spectrogram = Spectrogram::new(sample_rate, 2048, fps, 24);

        let spec = spectrogram.process(self.wave.channel(0));

        self.diff_spec = Some(superflux_diff_spec(spec, 1, 3));

        self.sample = 0;

        self.detect_peaks();
    }

    fn detect_peaks(&mut self) {
        // @todo this needs cleanup
        let fps = 200;
        if let Some(diff_spec) = &self.diff_spec {
            let detections = onset(self.threshold, diff_spec, fps);

            // Send detections as sample indexs
            self.detections = detections
                .iter()
                .map(|d| (d * self.wave.sample_rate() as f32) as usize)
                .collect::<Vec<_>>();
    
            let length_seconds = self.wave.len() as f32 / self.wave.sample_rate() as f32;

            // Send detections as seconds
            self.subject.notify(PlayerEvent::OnDetect(detections
                .iter()
                .map(|d| d / length_seconds)
                .collect::<Vec<_>>()));
            }
    }
}

#[derive(Clone)]
pub enum PlayerEvent {
    OnDetect(Vec<f32>),
}

impl<T> Observable for Wave32Player<T>
where
    T: Float,
{
    type Output = PlayerEvent;

    fn observe(&self) -> Observer<Self::Output> {
        self.subject.observe()
    }
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
                let start = self.detections[self.sample];
                let end = self.detections[self.sample + 1];
                &self.wave.channel(self.channel)[start..end]
            } else {
                self.wave.channel(self.channel)
            }
        };

        if self.index < wave.len() {
            let value = wave[self.index];
            self.index += 1;
            if self.index == wave.len() {
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
pub fn player<T: Float>(channel: usize, loop_point: Option<usize>, threshold: f32) -> An<Wave32Player<T>> {
    An(Wave32Player::new(
        Arc::new(Wave32::new(1, DEFAULT_SR)),
        channel,
        loop_point,
        threshold
    ))
}
