use dasp::{Sample, Signal};

pub struct Envelope<G, A, D, S, R>
where
    G: Signal<Frame = f64>,
    A: Signal<Frame = f64>,
    D: Signal<Frame = f64>,
    S: Signal<Frame = f64>,
    R: Signal<Frame = f64>,
{
    rate: f32,
    gate: G,
    attack: A,
    decay: D,
    sustain: S,
    release: R,
    value: f32,
    is_decaying: bool,
}

impl<G, A, D, S, R> Envelope<G, A, D, S, R>
where
    G: Signal<Frame = f64>,
    A: Signal<Frame = f64>,
    D: Signal<Frame = f64>,
    S: Signal<Frame = f64>,
    R: Signal<Frame = f64>,
{
    pub fn new(rate: f32, gate: G, attack: A, decay: D, sustain: S, release: R) -> Self {
        Self {
            rate: rate,
            gate: gate,
            attack: attack,
            decay: decay,
            sustain: sustain,
            release: release,
            value: 0.0,
            is_decaying: false,
        }
    }
}

impl<G, A, D, S, R> Signal for Envelope<G, A, D, S, R>
where
    G: Signal<Frame = f64>,
    A: Signal<Frame = f64>,
    D: Signal<Frame = f64>,
    S: Signal<Frame = f64>,
    R: Signal<Frame = f64>,
{
    type Frame = f32;

    fn next(&mut self) -> Self::Frame {
        let is_gated = self.gate.next() >= 1.0;

        let attack: f32 = self.attack.next().to_sample();
        let decay: f32 = self.decay.next().to_sample();
        let sustain: f32 = self.sustain.next().to_sample();
        let release: f32 = self.release.next().to_sample();

        const BASE: f32 = 20000.0;
        const MAX_TIME: f32 = 20.0;
        let step = 1.0 / self.rate;

        if is_gated {
            if self.is_decaying {
                self.value += BASE.powf(1.0 - decay) / MAX_TIME * (sustain - self.value) * step;
            } else {
                self.value += BASE.powf(1.0 - attack) / MAX_TIME * (1.01 - self.value) * step;
                if self.value >= 1.0 {
                    self.value = 1.0;
                    self.is_decaying = true;
                }
            }
        } else {
            self.value += BASE.powf(1.0 - release) / MAX_TIME * (0.0 - self.value) * step;
            self.is_decaying = false;
        }

        self.value
    }
}

#[test]
fn test_envelope() {
    const RATE: f32 = 20.;
    let envelope = Envelope::new(
        RATE,
        signal::rate(RATE as f64).const_hz(1.0).square(),
        signal::gen(|| 0.5),  // attack
        signal::gen(|| 0.5),  // decay
        signal::gen(|| 0.75), // sustain
        signal::gen(|| 0.5),  // release
    );

    let result = envelope.take(20).collect::<Vec<_>>();

    assert_eq!(
        result,
        vec![
            0.71417785,
            0.9233557,
            0.9846225,
            1.0,
            0.8232233,
            0.7714466,
            0.75628155,
            0.7518398,
            0.7505389,
            0.75015783,
            0.75004625,
            0.21968347,
            0.064343795,
            0.01884586,
            0.005519824,
            0.001616719,
            0.00047352596,
            0.00013869253,
            4.0622093e-5,
            1.1897937e-5
        ]
    );
}
