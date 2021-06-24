use dasp::{Sample, Signal, signal};
use splines::{Interpolation, Key, Spline};

// Dumb Attack-Decay contour
pub fn dumb(len: usize) -> impl Signal<Frame=f64> {
  let keys = vec![
    Key::new(0.0, 0., Interpolation::Cosine),
    Key::new(0.02, 1.0, Interpolation::Cosine), // Attack
    Key::new(0.03, 0.3, Interpolation::Cosine), // Attack
    Key::new(1.0, 0., Interpolation::Cosine), // Decay
  ];

  let spline = Spline::from_vec(keys);

  let steps = (0..len)
    .map(move |i| i as f64 / len as f64);
  
  signal::from_iter(steps)
    .map(move |i| {
      if let Some(sample) = spline.sample(i) {
        sample.to_sample()
      } else {
        0.0
      }
    })
} 