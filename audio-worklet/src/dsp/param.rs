use fundsp::{
    hacker::{AFollow},
    hacker32::{An, Pipe, Tag, Tagged},
    prelude::{follow, tag},
    Float,
};

pub fn param<T: Float>(id: Tag, value: T) -> An<Pipe<T, Tagged<T>, AFollow<T, f32, f32>>> {
    tag(id, value) >> follow(0.1) // Smooth out param over 0.1s
}

// @todo this is weird
pub fn param32(id: Tag, value: f32) -> An<Pipe<f32, Tagged<f32>, AFollow<f32, f32, f32>>> {
    param(id, value)
}
