use std::{intrinsics::transmute, sync::atomic::{AtomicU64, Ordering}};

pub struct AtomicFloat {
    inner: AtomicU64,
}

impl AtomicFloat {
    pub fn new(val: f64) -> AtomicFloat {
        AtomicFloat {
            inner: AtomicU64::new(f64_to_u64(val)),
        }
    }

    #[inline]
    pub fn get(&self) -> f64 {
        u64_to_f64(self.inner.load(Ordering::Relaxed))
    }

    #[inline]
    pub fn set(&self, val: f64) {
        self.inner.store(f64_to_u64(val), Ordering::Release)
    }
}

fn u64_to_f64(val: u64) -> f64 {
	unsafe { transmute(val) }
}

fn f64_to_u64(val: f64) -> u64 {
	unsafe { transmute(val) }
}
