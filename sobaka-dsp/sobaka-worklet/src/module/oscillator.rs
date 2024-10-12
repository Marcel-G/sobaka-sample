use crate::{
    dsp::{
        oscillator::{sobaka_saw, sobaka_sine, sobaka_square, sobaka_triangle},
        trigger::reset_trigger,
        volt_hz,
    },
    fundsp_worklet::FundspWorklet,
};
use fundsp::prelude::*;
use waw::{
    buffer::{AudioBuffer, ParamBuffer},
    worklet::{AudioModule, Emitter},
};

#[waw::derive::derive_param]
pub enum OscillatorParams {
    #[param(
        automation_rate = "a-rate",
        min_value = 0.,
        max_value = 600.,
        default_value = 120.
    )]
    Pitch,
}

#[waw::derive::derive_initial_state]
pub enum OscillatorShape {
    Sine,
    Square,
    Triangle,
    Saw,
}

#[waw::derive::derive_command]
pub enum OscillatorCommand {
    /// Selects the oscillator shape.
    SetShape(OscillatorShape),
}

pub struct Oscillator {
    current_shape: OscillatorShape,
    sine: FundspWorklet<OscillatorParams>,
    square: FundspWorklet<OscillatorParams>,
    triangle: FundspWorklet<OscillatorParams>,
    saw: FundspWorklet<OscillatorParams>,
}

impl AudioModule for Oscillator {
    type Param = OscillatorParams;
    type Command = OscillatorCommand;

    const INPUTS: u32 = 1;
    const OUTPUTS: u32 = 1;

    fn create(_init: Option<Self::InitialState>, _emitter: Emitter<Self::Event>) -> Self {
        let sine = {
            let param_storage = FundspWorklet::create_param_storage();
            let osc = reset_trigger({
                var(&param_storage[OscillatorParams::Pitch])
                    >> map::<_, _, U1, _>(|pitch| volt_hz(pitch[0]))
                    >> sobaka_sine()
                    >> shape(Shape::Tanh(0.8))
            });
            FundspWorklet::create(osc, param_storage)
        };

        let triangle = {
            let param_storage = FundspWorklet::create_param_storage();
            let osc = reset_trigger({
                var(&param_storage[OscillatorParams::Pitch])
                    >> map::<_, _, U1, _>(|pitch| volt_hz(pitch[0]))
                    >> sobaka_triangle()
                    >> shape(Shape::Tanh(0.8))
            });
            FundspWorklet::create(osc, param_storage)
        };

        let saw = {
            let param_storage = FundspWorklet::create_param_storage();
            let osc = reset_trigger({
                var(&param_storage[OscillatorParams::Pitch])
                    >> map::<_, _, U1, _>(|pitch| volt_hz(pitch[0]))
                    >> sobaka_saw()
                    >> shape(Shape::Tanh(0.8))
            });
            FundspWorklet::create(osc, param_storage)
        };

        let square = {
            let param_storage = FundspWorklet::create_param_storage();
            let osc = reset_trigger({
                var(&param_storage[OscillatorParams::Pitch])
                    >> map::<_, _, U1, _>(|pitch| volt_hz(pitch[0]))
                    >> sobaka_square()
                    >> shape(Shape::Tanh(0.8))
            });
            FundspWorklet::create(osc, param_storage)
        };

        Oscillator {
            current_shape: OscillatorShape::Sine,
            sine,
            saw,
            square,
            triangle,
        }
    }

    fn on_command(&mut self, command: Self::Command) {
        match command {
            OscillatorCommand::SetShape(shape) => {
                self.current_shape = shape;
            }
        }
    }

    fn process(&mut self, audio: &mut AudioBuffer, params: &ParamBuffer<Self::Param>) {
        match self.current_shape {
            OscillatorShape::Sine => self.sine.process(audio, params),
            OscillatorShape::Square => self.square.process(audio, params),
            OscillatorShape::Triangle => self.triangle.process(audio, params),
            OscillatorShape::Saw => self.saw.process(audio, params),
        }
    }
}

waw::main!(Oscillator);
