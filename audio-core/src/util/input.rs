use dasp::{
    graph::{Buffer, Input},
    slice::add_in_place,
};

pub fn filter_inputs<'a, T: PartialEq>(inputs: &'a [Input<T>], name: &T) -> Vec<&'a Input<T>> {
    inputs
        .iter()
        .filter(|input| &input.variant == name)
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
