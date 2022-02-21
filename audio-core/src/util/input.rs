use dasp::{
    graph::{Buffer, Input},
    slice::add_in_place,
};

use crate::graph::InputId;

pub fn filter_inputs<'a, T: Into<&'static str>>(
    inputs: &'a [Input<InputId>],
    name: T,
) -> Vec<&'a Input<InputId>> {
    let name_str: &'static str = name.into();
    inputs
        .iter()
        .filter(|input| *input.variant == *name_str)
        .collect::<Vec<_>>()
}

pub fn summed<T>(inputs: &[&Input<T>]) -> Buffer {
    let mut out = Buffer::default();
    for input in inputs {
        for buffer in input.buffers() {
            add_in_place(&mut out, buffer);
        }
    }
    out
}
