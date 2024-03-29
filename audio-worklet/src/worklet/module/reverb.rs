use super::ModuleContext;
use crate::dsp::{messaging::MessageHandler, param::param, shared::Share};
use fundsp::prelude::*;
use serde::{Deserialize, Serialize};
use ts_rs::TS;

#[derive(Default, Serialize, Deserialize, TS)]
#[ts(export)]
pub struct ReverbParams {
    pub wet: f32,
    pub length: f32,
}

/// Incoming commands into the reverb module
#[derive(Serialize, Deserialize, TS, Clone)]
#[ts(export)]
pub enum ReverbCommand {
    /// Sets the wet value of the reverb
    SetWet(f64),
    /// Sets the delay length of the reverb
    SetDelay(f64),
}

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

/// Stereo reverb.
/// `wet` in 0...1 is balance of reverb mixed in, for example, 0.1.
/// `time` is approximate reverberation time to -60 dB in seconds.
pub fn reverb_stereo<T, F>(wet: T, time: f64) -> An<impl AudioNode<Sample = T>>
where
    T: Float,
    F: Real,
{
    // Optimized delay times for a 32-channel FDN from a legacy project.
    const DELAYS: [f64; 32] = [
        0.073904, 0.052918, 0.066238, 0.066387, 0.037783, 0.080073, 0.050961, 0.075900, 0.043646,
        0.072095, 0.056194, 0.045961, 0.058934, 0.068016, 0.047529, 0.058156, 0.072972, 0.036084,
        0.062715, 0.076377, 0.044339, 0.076725, 0.077884, 0.046126, 0.067741, 0.049800, 0.051709,
        0.082923, 0.070121, 0.079315, 0.055039, 0.081859,
    ];

    let line = stack::<U32, T, _, _>(|i| {
        let a = param::<T>(1, T::from_f64(time))
            >> map(|t: &Frame<T, U1>| T::from_f32(fast_pow(db_amp(-60.0), 0.03 / t[0].to_f32())));

        delay::<T>(DELAYS[i as usize])
            >> fir((T::from_f32(0.5), T::from_f32(0.5)))
            >> (dcblock_hz::<T, F>(F::new(5)) * a)
    });

    // The feedback structure.
    let reverb = fdn::<U32, T, _>(line);

    let wet_mix = (pass() | pass()) * (param::<T>(0, wet) >> (pass() ^ pass()));
    let dry_mix =
        (pass() | pass()) * (param::<T>(0, wet) >> map(|f| T::one() - f[0]) >> (pass() ^ pass()));

    // Multiplex stereo into 32 channels, reverberate, then average them back.
    // Bus the reverb with the dry signal. Operator precedences work perfectly for us here.
    multisplit::<U2, U16, T>() >> reverb >> multijoin::<U2, U16, T>() >> wet_mix & dry_mix
}

pub fn reverb(
    params: &ReverbParams,
    context: &mut ModuleContext<ReverbCommand>,
) -> impl AudioUnit32 {
    let reverb = reverb_stereo::<f32, f32>(params.wet, params.length.into()).share();

    context.set_tx(
        reverb
            .clone()
            .message_handler(|unit, message: ReverbCommand| match message {
                ReverbCommand::SetWet(wet) => unit.set(0, wet.clamp(0.0, 1.0)),
                ReverbCommand::SetDelay(time) => unit.set(1, time.clamp(0.0, 10.0)),
            }),
    );

    reverb
}
