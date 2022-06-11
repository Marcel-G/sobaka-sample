use fundsp::prelude::*;

use super::ModuleContext;

pub fn noise(_params: (), _context: &mut ModuleContext) -> impl AudioUnit32 {
    white()
}
