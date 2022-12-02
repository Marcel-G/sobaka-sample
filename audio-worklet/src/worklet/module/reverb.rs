use crate::fundsp_worklet::FundspWorklet;
use fundsp::prelude::*;
use wasm_worklet::types::{AudioModule, ParamMap};

/// Raises 2 to a floating point power.
#[inline]
pub fn pow2(p: f32) -> f32 {
    let clipp = if p < -126.0 { -126.0_f32 } else { p };
    let v = ((1 << 23) as f32 * (clipp + 126.942_696_f32)) as u32;
    f32::from_bits(v)
}

/// Raises a number to a floating point power.
#[inline]
pub fn fast_pow(x: f32, p: f32) -> f32 {
    pow2(p * log2(x))
}

wasm_worklet::derive_param! {
    pub enum ReverbParams {
        #[param(
            automation_rate = "a-rate",
            min_value = 0.,
            max_value = 1.,
            default_value = 0.1
        )]
        Wet,
        #[param(
            automation_rate = "a-rate",
            min_value = 0.,
            max_value = 10.,
            default_value = 0.1
        )]
        Delay,
    }
}

pub struct Reverb {
    inner: FundspWorklet,
}

impl AudioModule for Reverb {
    type Param = ReverbParams;

    const INPUTS: u32 = 2;
    const OUTPUTS: u32 = 2;

    fn create() -> Self {
        let module = {
            // Optimized delay times for a 32-channel FDN from a legacy project.
            const DELAYS: [f64; 32] = [
                0.073904, 0.052918, 0.066238, 0.066387, 0.037783, 0.080073, 0.050961, 0.075900,
                0.043646, 0.072095, 0.056194, 0.045961, 0.058934, 0.068016, 0.047529, 0.058156,
                0.072972, 0.036084, 0.062715, 0.076377, 0.044339, 0.076725, 0.077884, 0.046126,
                0.067741, 0.049800, 0.051709, 0.082923, 0.070121, 0.079315, 0.055039, 0.081859,
            ];

            let line = stack::<U32, f32, _, _>(|i| {
                let a = tag(ReverbParams::Delay as i64, 0.0)
                    >> map(|t: &Frame<f32, U1>| {
                        f32::from_f32(fast_pow(db_amp(-60.0), 0.03 / t[0].to_f32()))
                    });

                delay::<f32>(DELAYS[i as usize])
                    >> fir((0.5, 0.5))
                    >> (dcblock_hz::<f32, f32>(5.0) * a)
            });

            // The feedback structure.
            let reverb = fdn::<U32, f32, _>(line);

            let wet_mix =
                (pass() | pass()) * (tag(ReverbParams::Wet as i64, 0.0) >> (pass() ^ pass()));
            let dry_mix = (pass() | pass())
                * (tag(ReverbParams::Wet as i64, 0.0)
                    >> map(|f| f32::one() - f[0])
                    >> (pass() ^ pass()));

            // Multiplex stereo into 32 channels, reverberate, then average them back.
            // Bus the reverb with the dry signal. Operator precedences work perfectly for us here.
            multisplit::<U2, U16, f32>() >> reverb >> multijoin::<U2, U16, f32>() >> wet_mix
                & dry_mix
        };

        Reverb {
            inner: FundspWorklet::create(module),
        }
    }

    fn process(
        &mut self,
        inputs: &[&[[f32; 128]]],
        outputs: &mut [&mut [[f32; 128]]],
        params: &ParamMap<Self::Param>,
    ) {
        self.inner.process(inputs, outputs, params);
    }
}

wasm_worklet::module!(Reverb);
