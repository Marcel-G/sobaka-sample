use fundsp::prelude::*;

use crate::dsp::hold::hold;

use super::ModuleContext;

pub fn sample_and_hold(_params: (), _context: &mut ModuleContext) -> impl AudioUnit32 {
    (pass() | stack::<U4, _, _, _>(|_n| pass()))
        >> map(|f: &Frame<f32, U5>| -> Frame<f32, U8> {
            // @todo probably better way to map the inputs
            // 0 - Gate   -- 0
            // 1 - Signal -- 1
            // 0 - Gate   -- 2
            // 2 - Signal -- 3
            // 0 - Gate   -- 4
            // 3 - Signal -- 5
            // 0 - Gate   -- 6
            // 4 - Signal -- 7
            Frame::from([f[1], f[0], f[2], f[0], f[3], f[0], f[4], f[0]])
        })
        >> stack::<U4, _, _, _>(|_i| hold())
}
