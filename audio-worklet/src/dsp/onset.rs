use std::{f64::consts::PI, iter::repeat};

use num_traits::{Float, FromPrimitive, NumCast, NumOps};
use rustfft::{num_complex::Complex, FftPlanner};

struct Filter {
    weights: Vec<Vec<f32>>,
}

impl Filter {
    pub fn new(sr: f32, n_fft: usize, bands_per_oct: usize) -> Self {
        let fmin = 30.0;
        let fmax = 17000.0;
        let num_fft_bins = 1 + n_fft / 2;

        let fft_f = fft_frequencies::<f32>(sr, n_fft);

        // get a list of frequencies
        let band_f = band_frequencies(bands_per_oct, fmin, fmax, None);

        // // number of bands
        let n_bands = band_f.len() - 2;

        // init the filter matrix with size: number of FFT bins x filter bands
        let mut weights = vec![vec![0.0; num_fft_bins]; n_bands];

        let fdiff: Vec<_> = band_f[..band_f.len() - 1]
            .iter()
            .zip(band_f[1..].iter())
            .map(|(x, y)| *y - *x)
            .collect();

        let mut ramps = vec![vec![0.0; fft_f.len()]; band_f.len()];

        band_f.iter().enumerate().for_each(|(i, m)| {
            fft_f.iter().enumerate().for_each(|(j, f)| {
                ramps[i][j] = *m - *f;
            });
        });

        for i in 0..n_bands {
            for j in 0..num_fft_bins {
                // lower and upper slopes for all bins
                let lower = -ramps[i][j] / fdiff[i];
                let upper = ramps[i + 2][j] / fdiff[i + 1]; // +2 is safe since we create `n_bands` is - 2

                // .. then intersect them with each other and zero
                weights[i][j] = 0.0.max(lower.min(upper));
            }
        }
        Self { weights }
    }

    pub fn process(&self, spec: &[f32]) -> Vec<f32> {
        assert!(
            spec.len() == self.weights[0].len(),
            "spectrogram length does not match filter length"
        );

        dot(spec, &self.weights)
    }
}

pub struct Spectrogram {
    fft_size: usize,
    sample_rate: f32,
    fps: usize,
    window: Vec<f32>,
    filter: Filter,
    fft: FftPlanner<f32>,
}

impl Spectrogram {
    pub fn new(sample_rate: f32, fft_size: usize, fps: usize, bands_per_oct: usize) -> Self {
        let window = hanning(fft_size);
        let filter = Filter::new(sample_rate, fft_size, bands_per_oct);
        let fft = FftPlanner::new();
        Self {
            fps,
            fft_size,
            sample_rate,
            window,
            filter,
            fft,
        }
    }

    // @todo reorganise params
    pub fn process(&mut self, audio: &[f32]) -> Vec<Vec<f32>> {
        let window_size = self.fft_size;
        let hop_size = (self.sample_rate / self.fps as f32).floor() as usize; // wav sample rate
        let num_bins = self.filter.weights[0].len();

        let fft = self.fft.plan_fft_forward(window_size);

        // split audio into frames.
        pad(audio, window_size - 1)
          .windows(window_size)
          // Filter to match fps
          .enumerate()
          .filter_map(|(index, frame)|
            if index % (hop_size + 1) == 0 { Some(frame) } else { None }
          )
          // Apply henning window fn to frame
          .map(|frame| frame
            .iter()
            .zip(&self.window)
            .map(|(v, w)| v * w)
            .collect::<Vec<_>>()
          )
          // Perform FFT
          .map(|frame| -> Vec<f32> {
            let mut buffer = frame
              .into_iter()
              .map(|v| Complex::new(v, 0.0))
              .collect::<Vec<_>>();

            fft.process(&mut buffer);

            buffer.into_iter().map(|v| v.norm()).collect()
          })
          // Apply filter
          .map(|frame| self.filter.process(&frame[..num_bins]))
          .collect()
    }
}

pub fn superflux_diff_spec(spec: Vec<Vec<f32>>, diff_frames: usize, max_bins: usize) -> Vec<f32> {
    let max_spec = spec.iter().map(|v| maximum_filter(v, max_bins));

    let diff_spec = spec[diff_frames..]
        .iter()
        .zip(max_spec)
        .map(|(s, m)| {
            s.iter()
                .zip(m.iter())
                .map(|(x, d)| (x - d).max(0.0))
                .collect()
        })
        .collect::<Vec<Vec<f32>>>();

    diff_spec.iter().map(|v| v.iter().sum()).collect()
}

pub fn onset(threshold: f32, activations: &[f32], fps: usize) -> Vec<f32> {
    // moving maximum
    let mov_max = maximum_filter(activations, 3);

    // moving average
    let mov_avg = uniform_filter(activations, 3);

    let detections: Vec<f32> = activations
        .iter()
        // detections are activation equal to the moving maximum
        .zip(mov_max.into_iter())
        .map(|(activation, max)| if *activation == max { *activation } else { 0.0 })
        // detections must be greater or equal than the mov. average + threshold
        .zip(mov_avg.into_iter())
        .map(|(activation, avg)| {
            if activation >= avg + threshold {
                activation
            } else {
                0.0
            }
        })
        // convert detected onsets to a list of timestamps
        .enumerate()
        .filter_map(|(index, activation)| {
            if activation > 0.0 {
                Some(index as f32 / fps as f32)
            } else {
                None
            }
        })
        .collect();

    detections
}

// Utility functions

fn dot(a: &[f32], b: &[Vec<f32>]) -> Vec<f32> {
    b.iter()
        .map(|y| a.iter().zip(y).map(|(x, y)| x * y).sum())
        .collect()
}

fn linspace<T: Float + FromPrimitive>(x0: T, xend: T, n: usize) -> Vec<T> {
    let to_float = |i: usize| T::from_usize(i).unwrap_or_else(|| panic!());
    let dx = (xend - x0) / to_float(n - 1);
    (0..n).map(|i| x0 + to_float(i) * dx).collect()
}

/// Generates a window of length `n` with the Hann function.
fn hanning<T: Float + FromPrimitive>(n: usize) -> Vec<T> {
    let alphas = [0.5, -0.5];
    let mut window = Vec::with_capacity(n);
    let f0 = 2.0 * PI / ((n - 1) as f64);
    for i in 0..n {
        let mut wi = 0.0;
        for (k, ak) in alphas.iter().enumerate() {
            wi += ak * (f0 * k as f64 * i as f64).cos();
        }
        window.push(T::from_f64(wi).unwrap_or_else(|| panic!()));
    }
    window
}

/// Implementation of `librosa.fft_frequencies`
fn fft_frequencies<T: Float + NumOps + FromPrimitive>(sr: f32, n_fft: usize) -> Vec<T> {
    linspace(T::zero(), NumCast::from(sr / 2.).unwrap(), 1 + n_fft / 2)
}

/// Returns a list of frequencies aligned on a logarithmic scale
fn band_frequencies(bands: usize, fmin: f32, fmax: f32, a: Option<f32>) -> Vec<f32> {
    // @todo make use of linspace here then convert to exp.
    let factor = 2.0_f32.powf(1.0 / bands as f32);
    let mut freq = a.unwrap_or(440.0);
    let mut frequencies = Vec::with_capacity(bands);

    frequencies.push(freq);

    while freq <= fmax {
        freq *= factor;
        frequencies.push(freq);
    }

    freq = a.unwrap_or(440.0);

    while freq >= fmin {
        freq /= factor;
        frequencies.push(freq);
    }

    frequencies.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));

    frequencies
}

fn uniform_filter(input: &[f32], size: usize) -> Vec<f32> {
    pad(input, size - 1)
        .windows(size)
        .map(|window| window.iter().cloned().sum::<f32>() / size as f32)
        .collect()
}

fn maximum_filter(input: &[f32], size: usize) -> Vec<f32> {
    // possible optimisation: https://www.nayuki.io/page/sliding-window-minimum-maximum-algorithm/
    pad(input, size - 1)
        .windows(size)
        .map(|window| {
            window
                .iter()
                .cloned()
                .max_by(|i, j| i.partial_cmp(j).unwrap())
                .unwrap()
        })
        .collect()
}

fn pad<T: Clone>(input: &[T], size: usize) -> Vec<T> {
    if let (Some(first), Some(last)) = (input.first(), input.last()) {
        let right = size / 2;
        let left = size - right;

        repeat(first)
            .take(left)
            .chain(input.iter())
            .chain(repeat(last).take(right))
            .cloned()
            .collect()
    } else {
        panic!("input must have at least one element");
    }
}

// Tests

// @todo combine tests

#[cfg(test)]
mod filters {
    use super::{dot, maximum_filter, pad, uniform_filter};

    #[test]
    fn test_dot() {
        // ```python
        // >>> np.array([[4., 5., 6.], [7., 8., 9.]]).dot(np.array([1., 2., 3.]))
        // array([32., 50.])
        // ```

        assert_eq!(
            dot(&[1., 2., 3.], &[vec![4., 5., 6.], vec![7., 8., 9.]]),
            vec![32., 50.]
        )
    }

    #[test]
    fn test_pad() {
        assert_eq!(pad(&vec![1, 2, 3, 4, 5], 1), vec![1, 1, 2, 3, 4, 5]);

        assert_eq!(pad(&vec![1, 2, 3, 4, 5], 2), vec![1, 1, 2, 3, 4, 5, 5]);

        assert_eq!(pad(&vec![1, 2, 3, 4, 5], 3), vec![1, 1, 1, 2, 3, 4, 5, 5]);
    }

    #[test]
    fn test_uniform_filter() {
        //
        // ```python
        // >>> from scipy.ndimage import uniform_filter1d
        // >>> uniform_filter1d([2., 8., 0., 4., 1., 9., 9., 0.], size=3)
        // array([4.        , 3.33333333, 4.        , 1.66666667, 4.66666667,
        //        6.33333333, 6.        , 3.        ])
        // ```
        //
        assert_eq!(
            uniform_filter(&vec![2.0, 8.0, 0.0, 4.0, 1.0, 9.0, 9.0, 0.0], 3),
            vec![4.0, 3.33333333, 4.0, 1.66666667, 4.66666667, 6.33333333, 6.0, 3.0]
        );

        // ```python
        // >>> from scipy.ndimage import uniform_filter1d
        // >>> uniform_filter1d([2., 8., 0., 4., 1., 9., 9., 0.], size=2)
        // array([2. , 5. , 4. , 2. , 2.5, 5. , 9. , 4.5])
        // ```
        assert_eq!(
            uniform_filter(&vec![2.0, 8.0, 0.0, 4.0, 1.0, 9.0, 9.0, 0.0], 2),
            vec![2., 5., 4., 2., 2.5, 5., 9., 4.5]
        );
    }

    #[test]
    fn test_maximum_filter() {
        // ```python
        // >>> maximum_filter([[31., 41., 59., 26., 53., 58., 97.]], size=[1, 3])
        // array([[41., 59., 59., 59., 58., 97., 97.]])
        // ```
        assert_eq!(
            maximum_filter(&vec![31., 41., 59., 26., 53., 58., 97.], 3),
            vec![41., 59., 59., 59., 58., 97., 97.]
        );
    }
}

#[cfg(test)]
mod freq_tests {
    use crate::dsp::onset::linspace;

    use super::{band_frequencies, fft_frequencies, hanning};

    #[test]
    fn test_hanning() {
        assert_eq!(
            hanning::<f32>(10),
            vec![
                0.0, 0.11697778, 0.4131759, 0.75, 0.9698463, 0.9698463, 0.75, 0.4131759,
                0.11697778, 0.0
            ]
        )
    }

    #[test]
    fn test_fft_frequencies() {
        assert_eq!(
            fft_frequencies::<f32>(22050.0, 16),
            vec![0., 1378.125, 2756.25, 4134.375, 5512.5, 6890.625, 8268.75, 9646.875, 11025.]
        );
    }

    #[test]
    fn test_band_frequencies() {
        assert_eq!(
            band_frequencies(3, 30.0, 17000.0, None),
            vec![
                27.499998, 34.647827, 43.653526, 54.999996, 69.295654, 87.30705, 109.99999,
                138.59131, 174.6141, 219.99998, 277.18262, 349.2282, 440.0, 554.3653, 698.45654,
                880.0001, 1108.7307, 1396.9132, 1760.0004, 2217.4617, 2793.8267, 3520.001,
                4434.9233, 5587.6533, 7040.002, 8869.847, 11175.307, 14080.004, 17739.693
            ]
        )
    }

    #[test]
    fn test_linspace() {
        // ```python
        // >>> np.linspace(2.0, 3.0, num=5)
        // array([2.  , 2.25, 2.5 , 2.75, 3.  ])
        // ```

        assert_eq!(linspace(2.0, 3.0, 5), vec![2.0, 2.25, 2.5, 2.75, 3.0]);

        // ```python
        // >>> np.linspace(2.0, 10.0, num=5)
        // array([ 2.,  4.,  6.,  8., 10.])
        // ```

        assert_eq!(linspace(2.0, 10.0, 5), vec![2.0, 4.0, 6.0, 8.0, 10.0]);
    }
}

#[cfg(test)]
mod filter_tests {
    use super::Filter;

    #[test]
    fn test_filter() {
        let filter = Filter::new(44100.0, 128, 1);

        assert_eq!(filter.weights.len(), 9); // n_bands
        assert_eq!(filter.weights[0].len(), 65); // fft bins

        // 440 Hz sine wave spectrogram
        let spec = vec![
            0.6120027,
            31.023468,
            22.28843,
            2.5304267,
            0.5280031,
            0.20544228,
            0.10342992,
            0.059602015,
            0.038008604,
            0.025380593,
            0.0179684,
            0.01315524,
            0.010050413,
            0.007824012,
            0.006126815,
            0.0045150537,
            0.004252252,
            0.0029265513,
            0.003413936,
            0.0011783353,
            0.002728246,
            0.0006245904,
            0.0026407668,
            0.0004517355,
            0.0016468683,
            0.00055006257,
            0.0009420839,
            0.00047994716,
            0.0007081633,
            0.00059729593,
            0.0004822407,
            0.00048225,
            0.00071622984,
            0.0005343817,
            0.00011641792,
            0.00030519612,
            0.00034398233,
            0.00022121446,
            0.0005641531,
            0.0005580637,
            0.0009751413,
            0.00066330394,
            0.00091257977,
            0.0005134642,
            0.0004797577,
            0.00021577322,
            0.00012325642,
            0.00013198884,
            0.00019620662,
            0.00026412742,
            0.00022709105,
            0.0001234166,
            9.5533425e-5,
            0.0003447883,
            0.0007921236,
            0.000882052,
            0.00081021007,
            0.0010494932,
            0.000702389,
            0.000266621,
            0.00028528328,
            0.0002191098,
            0.0011191642,
            0.0015193672,
            0.0011852384,
        ];
        assert_eq!(
            filter.process(&spec),
            vec![
                0.0,
                0.0,
                13.462599,
                27.232908,
                14.943005,
                1.0834682,
                0.13449663,
                0.028311979,
                0.014158637
            ]
        )
    }
}

#[cfg(test)]
mod spectrogram_tests {
    use fundsp::{math::sin_hz, Float};

    fn argmax<T: Float>(slice: &[T]) -> usize {
        let (index, _) =
            slice
                .iter()
                .enumerate()
                .fold((0, slice[0]), |(idx_max, val_max), (idx, val)| {
                    if &val_max > val {
                        (idx_max, val_max)
                    } else {
                        (idx, *val)
                    }
                });

        index
    }

    #[test]
    fn test_spectrogram() {
        let mut spectrogram = super::Spectrogram::new(44100.0, 2048, 200, 24);
        // generate 1s sine wave of 440Hz at 44100Hz
        let audio = (0..44100)
            .map(|x| sin_hz(440.0, x as f32 / 44100.0))
            .collect::<Vec<_>>();

        let spec = spectrogram.process(&audio);

        assert_eq!(spec.len(), 200);

        // Expect a peak at 440hz
        // 93 is 440hz in this configuration
        assert_eq!(argmax(&spec[0]), 93);
    }
}

#[cfg(test)]
mod odf_tests {
    use crate::dsp::onset::{onset, superflux_diff_spec, hanning};
    use fundsp::math::sin_hz;

    // write a test that loads a wav file, initialises a Spectrogram and processes the wave file.
    #[test]
    fn test_odf() {
        let fps = 200;
        let window: Vec<f32> = hanning(44100);
        let mut spectrogram = super::Spectrogram::new(44100.0, 512, fps, 24);
        // Generate 0.5s sine wave of 440Hz at 44100Hz
        let audio: Vec<f32> = (0..44100 / 2)
            .map(|x| sin_hz(440.0, x as f32 / 44100.0))
            // Then add 0.5s of 880Hz onto the end
            .chain((0..44100 / 2).map(|x| sin_hz(880.0, x as f32 / 44100.0)))
            // Apply a window, so it fades in and out slowly
            .zip(window.iter())
            .map(|(x, w)| x * w)
            .collect();

        let spec = spectrogram.process(&audio);

        let diff_spec = superflux_diff_spec(spec, 1, 3);

        let detections = onset(30.0, &diff_spec, fps);

        assert!(!detections.is_empty());
        assert_eq!(detections[0], 0.495);
    }
}
