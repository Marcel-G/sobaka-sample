mod utils;
use js_sys;
use wasm_bindgen::prelude::*;
// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[no_mangle]
pub extern "C" fn alloc(size: usize) -> *mut f32 {
    let vec: Vec<f32> = vec![0.0; size];
    Box::into_raw(vec.into_boxed_slice()) as *mut f32
}

#[no_mangle]
pub extern "C" fn process(out_ptr_l: *mut f32, out_ptr_r: *mut f32, size: usize) {
    let out_buf_l: &mut [f32] = unsafe { std::slice::from_raw_parts_mut(out_ptr_l, size)};
    let out_buf_r: &mut [f32] = unsafe { std::slice::from_raw_parts_mut(out_ptr_r, size)};

    make_noise(out_buf_l, out_buf_r);
}

pub fn make_noise(out_l: &mut [f32], out_r: &mut [f32]) {
    for i in 0..128 {
        out_l[i] = 2.0 * (js_sys::Math::random() as f32 - 0.5);
        out_r[i] = 2.0 * (js_sys::Math::random() as f32 - 0.5);
    }    
}

  