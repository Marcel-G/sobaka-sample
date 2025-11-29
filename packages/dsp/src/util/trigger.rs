use fundsp::prelude::*;
use std::sync::atomic::{AtomicBool, Ordering};

pub struct SchmittTrigger {
    is_open: AtomicBool,
}

impl Clone for SchmittTrigger {
    fn clone(&self) -> Self {
        SchmittTrigger::new()
    }
}

impl SchmittTrigger {
    pub fn new() -> Self {
        Self {
            is_open: AtomicBool::new(false),
        }
    }
    pub fn tick<T: Float>(&self, input: T, off_threshold: f64, on_threshold: f64) -> Option<bool> {
        if self.is_open.load(Ordering::SeqCst) {
            // High to low
            if input <= T::from_f64(off_threshold) {
                self.is_open.store(false, Ordering::SeqCst);
                return Some(false);
            }
            // Low to High
        } else if input >= T::from_f64(on_threshold) {
            self.is_open.store(true, Ordering::SeqCst);
            return Some(true);
        }
        None
    }

    pub fn is_open(&self) -> bool {
        self.is_open.load(Ordering::SeqCst)
    }

    pub fn reset(&mut self) {
        self.is_open.store(true, Ordering::SeqCst);
    }
}

impl Default for SchmittTrigger {
    fn default() -> Self {
        Self::new()
    }
}
