#![feature(async_closure)]

use utils::panic_hook::set_panic_hook;
use wasm_bindgen::prelude::wasm_bindgen;

pub mod dsp;
mod fundsp_worklet;
mod media_manager;
pub mod module;
mod utils;

mod worker;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen(start)]
pub fn main() {
    set_panic_hook()
}
