pub mod clock;
pub mod delay;
pub mod envelope;
pub mod io;
pub mod oscillator;
pub mod parameter;
pub mod sequencer;
pub mod sink;
pub mod sum;
pub mod traits;
pub mod volume;

use crate::graph::AudioGraph;

use self::{
    clock::ClockModule, delay::DelayModule, envelope::EnvelopeModule, io::Output,
    oscillator::OscillatorModule, parameter::ParameterModule, sequencer::SequencerModule,
    sink::SinkModule, sum::SumModule, traits::Module, volume::VolumeModule,
};

#[impl_enum::with_methods {
	pub fn create(&mut self, core: &mut AudioGraph) {}
	pub fn dispose(&mut self, core: &mut AudioGraph) {}
	pub fn output(&self) -> Option<&Output> {}
}]
pub enum AudioModule {
    Clock(ClockModule),
    Envelope(EnvelopeModule),
    Oscillator(OscillatorModule),
    Parameter(ParameterModule),
    Sequencer(SequencerModule),
    Volume(VolumeModule),
    Delay(DelayModule),
    Sink(SinkModule),
    Sum(SumModule),
}
