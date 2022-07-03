use std::f64::{INFINITY, NEG_INFINITY};

use fundsp::{
    hacker::{An, AudioNode, Frame, U1, U2},
    Float, DEFAULT_SR,
};

use crate::utils::observer::{Observable, Observer, Producer, Subject};

use super::trigger::SchmittTrigger;

const BUFFER_SIZE: usize = 256;

#[derive(Clone, Copy)]
struct Point<T> {
    min: T,
    max: T,
    count: usize,
}

impl<T: Float> Default for Point<T> {
    fn default() -> Self {
        Self {
            min: T::from_f64(INFINITY),
            max: T::from_f64(NEG_INFINITY),
            count: 0,
        }
    }
}

pub struct Scope<T: Float> {
    // The rate to send updates per second.
    rate: usize,
    tick: usize,
    buffer: [Point<T>; BUFFER_SIZE],
    next_point: Point<T>,
    index: usize,
    trigger: SchmittTrigger,
    sample_rate: f64,
    subject: Subject<ScopeEvent>,
    threshold: T,
    time: f64,
    trigger_enabled: bool,
}

impl<T: Float> Scope<T> {
    pub fn new(rate: usize, sample_rate: f64) -> Self {
        Self {
            rate,
            buffer: [Point::default(); BUFFER_SIZE],
            sample_rate,
            next_point: Point::default(),
            subject: Subject::new(),
            trigger: SchmittTrigger::default(),
            index: 0,
            tick: 0,
            threshold: T::from_f64(0.0),
            time: 0.0,
            trigger_enabled: true,
        }
    }

    fn send_frame_update(&self) {
        self.subject.notify(ScopeEvent::Update(
            self.buffer
                .iter()
                .map(|p| (p.max.to_f32(), p.min.to_f32()))
                .collect(),
        ));
    }

    pub fn set_threshold(&mut self, threshold: f64) {
        self.threshold = T::from_f64(threshold);
    }

    pub fn set_time(&mut self, time: f64) {
        self.time = time;
    }

    pub fn set_trigger_enabled(&mut self, trigger_enabled: bool) {
        self.trigger_enabled = trigger_enabled;
    }
}

#[derive(Clone)]
pub enum ScopeEvent {
    Update(Vec<(f32, f32)>),
}

impl<T: Float> Observable for Scope<T> {
    type Output = ScopeEvent;

    fn observe(&self) -> Observer<Self::Output> {
        self.subject.observe()
    }
}

impl<T: Float> AudioNode for Scope<T> {
    const ID: u64 = 0;
    type Sample = T;
    type Inputs = U2;
    type Outputs = U1;

    fn reset(&mut self, sample_rate: Option<f64>) {
        if let Some(sr) = sample_rate {
            self.sample_rate = sr;
        }
    }

    fn tick(
        &mut self,
        input: &Frame<Self::Sample, Self::Inputs>,
    ) -> Frame<Self::Sample, Self::Outputs> {
        let y = input[0];

        if self.index >= BUFFER_SIZE {
            if !self.trigger_enabled
                || self
                    .trigger
                    .tick(y, self.threshold.to_f64(), self.threshold.to_f64() + 0.001)
            {
                self.index = 0;
                self.trigger.reset();
            }
        } else {
            let delta_time = 2.0_f64.powf(-self.time) / BUFFER_SIZE as f64;
            let frame_count = (delta_time * self.sample_rate).ceil() as usize;

            let next_point = &mut self.next_point;

            next_point.min = y.min(next_point.min);
            next_point.max = y.max(next_point.max);
            next_point.count += 1;

            if next_point.count >= frame_count {
                self.buffer[self.index] = self.next_point;
                self.next_point = Point::default();
                self.index += 1;
            }
        }

        let is_frame_pending = self.tick > self.sample_rate as usize / self.rate;
        if is_frame_pending {
            self.tick = 0;
            self.send_frame_update();
        }
        self.tick += 1;

        // Pass on whatever frame we got.
        Frame::splat(y)
    }
}

#[inline]
pub fn scope<T: Float>(rate: usize) -> An<Scope<T>> {
    An(Scope::new(rate, DEFAULT_SR))
}
