use getrandom::{register_custom_getrandom, Error};
use js_sys::Math;

// Hacky Math.random RNG
// WASM RNGs usually use the `window.Crypto` api or `require('crypto')`
// Both of these are not available in the AudioWorklet environment.
//
// - https://github.com/uuid-rs/uuid/pull/512
// - Audio worklet discussion - https://forum.openmpt.org/index.php?topic=6548.15
// - getrandom JS implementations - https://github.com/rust-random/getrandom/blob/master/src/js.rs
fn getrandom_inner(dest: &mut [u8]) -> Result<(), Error> {
    for v in dest.iter_mut() {
        *v = unsafe { (Math::random() * 255.0) as u8 }
    }
    Ok(())
}

register_custom_getrandom!(getrandom_inner);
