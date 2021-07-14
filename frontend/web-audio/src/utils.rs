use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn set_panic_hook() {
  console_error_panic_hook::set_once();
}
