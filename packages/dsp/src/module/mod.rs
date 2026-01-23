// Re-export all module processors
pub mod clock;
pub mod delay;
pub mod envelope;
pub mod filter;
pub mod lfo;
pub mod noise;
pub mod oscillator;
pub mod quantiser;
pub mod reverb;
pub mod sample_and_hold;
pub mod scope;

// Re-export processor types for convenience
pub use clock::processor::*;
pub use delay::processor::*;
pub use envelope::processor::*;
pub use filter::processor::*;
pub use lfo::processor::*;
pub use noise::processor::*;
pub use oscillator::processor::*;
pub use quantiser::processor::*;
pub use reverb::processor::*;
pub use sample_and_hold::processor::*;
pub use scope::processor::*;
