use async_std::task::spawn_local;
use futures::{
    future::FutureObj,
    task::{Spawn, SpawnError},
};

pub struct WasmSpawner;

impl WasmSpawner {
    pub fn new() -> Self {
        WasmSpawner
    }
}

impl Default for WasmSpawner {
    fn default() -> Self {
        Self::new()
    }
}

impl Spawn for WasmSpawner {
    fn spawn_obj(&self, future: FutureObj<'static, ()>) -> Result<(), SpawnError> {
        spawn_local(future);

        Ok(())
    }
}

unsafe impl Send for WasmSpawner {}
unsafe impl Sync for WasmSpawner {}
