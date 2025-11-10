use crate::{
    dsp::{envelope::sobaka_adsr, trigger::trigger_listener},
    fundsp_worklet::FundspWorklet,
};
use waw::{
    buffer::{AudioBuffer, ParamBuffer},
    worklet::{AudioModule, Emitter},
};

#[waw::derive::derive_param]
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

#[waw::derive::derive_event]
#[derive(Clone)]
pub enum EnvelopeEvent {
    NoteOn,
    NoteOff,
}

pub struct Envelope {
    inner: FundspWorklet<EnvelopeParams>,
}

impl AudioModule for Envelope {
    type Param = EnvelopeParams;
    type Event = EnvelopeEvent;

    fn create(_init: Option<Self::InitialState>, emitter: Emitter<Self::Event>) -> Self {
        let param_storage = FundspWorklet::create_param_storage();

        let module = trigger_listener(move |is_high| match is_high {
            true => emitter.send(EnvelopeEvent::NoteOn),
            false => emitter.send(EnvelopeEvent::NoteOff),
        }) >> sobaka_adsr(
            param_storage[EnvelopeParams::Attack].clone(),
            param_storage[EnvelopeParams::Decay].clone(),
            param_storage[EnvelopeParams::Sustain].clone(),
            param_storage[EnvelopeParams::Release].clone(),
        );

        Envelope {
            inner: FundspWorklet::create(module, param_storage),
        }
    }

    fn process(&mut self, audio: &mut AudioBuffer, params: &ParamBuffer<Self::Param>) {
        self.inner.process(audio, params);
    }
}

waw::main!(Envelope);
