use crate::{
    dsp::{envelope::dsp_envelope, trigger::SchmittTrigger},
    fundsp_worklet::FundspWorklet,
    utils::atomic_float::AtomicFloat,
};
use fundsp::prelude::*;
use wasm_worklet::types::{AudioModule, ParamMap};

// g_{2}\left(x,l,u\right)=f_{2}\left(\frac{x-l}{u-l}\right)\left(u-l\right)+l
fn g2(x: f32, l: f32, u: f32) -> f32 {
    f2((x - l) / (u - l)) * (u - l) + l
}

// f_{1}\left(x\right)=x^{\frac{1}{3}}
fn f1(x: f32) -> f32 {
    x.powf(1.0 / 3.0)
}

// f_{2}\left(x\right)=x^{3}
fn f2(x: f32) -> f32 {
    x.powf(3.0)
}

wasm_worklet::derive_param! {
    pub enum EnvelopeParams {
        #[param(
            automation_rate = "a-rate",
            min_value = 0.,
            max_value = 1.0,
            default_value = 0.1
        )]
        Attack,
        #[param(
            automation_rate = "a-rate",
            min_value = 0.,
            max_value = 1.0,
            default_value = 0.1
        )]
        Decay,
        #[param(
            automation_rate = "a-rate",
            min_value = 0.,
            max_value = 1.0,
            default_value = 0.1
        )]
        Sustain,
        #[param(
            automation_rate = "a-rate",
            min_value = 0.,
            max_value = 1.0,
            default_value = 0.1
        )]
        Release,
    }
}

pub struct Envelope {
    inner: FundspWorklet,
}

impl AudioModule for Envelope {
    type Param = EnvelopeParams;

    fn create() -> Self {
        let module = {
            let on_offset = AtomicFloat::new(0.0);
            let off_offset = AtomicFloat::new(0.0);
            let trigger = SchmittTrigger::new();

            let env = dsp_envelope(move |time: f32, inputs: Frame<f32, U5>| {
                let gate = inputs[0];
                let attack = inputs[1];
                let decay = inputs[2];
                let sustain = inputs[3].clamp(0.0 + f32::EPSILON, 1.0 - f32::EPSILON);
                let release = inputs[4];

                if let Some(is_open) = trigger.tick(gate, 0.0, 0.001) {
                    if is_open {
                        on_offset.set(time as f64);
                    } else {
                        off_offset.set(time as f64);
                    }
                }

                let position = time - on_offset.get() as f32;
                if trigger.is_open() {
                    // https://www.desmos.com/calculator/nduy9l2pez
                    if position < attack {
                        f1(1.0 / attack * position)
                    } else if position < decay + attack {
                        g2(
                            ((sustain - 1.0) / decay) * (position - attack) + 1.0,
                            sustain,
                            1.0,
                        )
                    } else {
                        sustain
                    }
                } else {
                    let sustain_time = off_offset.get() as f32 - on_offset.get() as f32;
                    if position < sustain_time + release {
                        g2(
                            (-sustain / release) * (position - sustain_time) + sustain,
                            0.0,
                            sustain,
                        )
                    } else {
                        0.0
                    }
                }
            });

            let params = pass() | // Gate input
                tag(EnvelopeParams::Attack as i64, 0.) |
                tag(EnvelopeParams::Sustain as i64, 0.) |
                tag(EnvelopeParams::Attack as i64, 0.) |
                tag(EnvelopeParams::Release as i64, 0.);

            params >> env >> declick::<f32, f32>()
        };

        Envelope {
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

wasm_worklet::module!(Envelope);
