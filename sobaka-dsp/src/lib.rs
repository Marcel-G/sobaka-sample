use utils::panic_hook::set_panic_hook;
use wasm_bindgen::prelude::wasm_bindgen;

pub mod dsp;
pub mod module;
mod utils;

#[wasm_bindgen(start)]
pub fn main() {
    set_panic_hook()
}
