use fundsp::hacker32::*;

use super::{module, AudioModule32};

pub fn noise() -> impl AudioModule32 {
    module(white())
}
