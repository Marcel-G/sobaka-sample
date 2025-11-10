use std::sync::Arc;
use std::sync::Mutex;

mod pool;
use futures_channel::oneshot;
use futures_channel::oneshot::Canceled;
use pool::WorkerPool;
use std::fmt::Debug;
use wasm_bindgen::prelude::wasm_bindgen;
use wasm_bindgen::JsCast;

thread_local! {
    pub static WORKER_THREAD: Arc<Mutex<Option<pool::WorkerPool>>> = Arc::new(Mutex::new(None));
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "WorkerOptions")]
    pub type TSWorkerOptions;
}

#[wasm_bindgen]
pub async fn init_worker(pkg_js: &str, worker_options: TSWorkerOptions) {
    let options = worker_options.unchecked_into();
    let pool = WorkerPool::new(2, pkg_js, options).unwrap();

    WORKER_THREAD.with(|thread| {
        let mut global_thread = thread.lock().unwrap();
        *global_thread = Some(pool)
    })
}

pub async fn run<F, R>(f: F) -> Result<R, Canceled>
where
    F: FnOnce() -> R + Send + 'static,
    R: Send + Debug + 'static,
{
    let (tx, rx) = oneshot::channel::<R>();
    WORKER_THREAD.with(|thread| {
        if let Some(pool) = thread.lock().unwrap().as_ref() {
            pool.run(|| {
                tx.send(f()).unwrap();
            })
            .unwrap();
        }
    });

    rx.await
}
