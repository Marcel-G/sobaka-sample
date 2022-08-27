use fundsp::prelude::*;

use crate::dsp::hold::hold;

use super::ModuleContext;

pub fn sample_and_hold(_params: (), _context: &mut ModuleContext) -> impl AudioUnit32 {
    hold()
}
