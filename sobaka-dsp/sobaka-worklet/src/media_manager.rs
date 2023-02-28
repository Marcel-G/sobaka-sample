use std::collections::HashMap;
use std::ops::Deref;
use std::sync::Arc;
use std::{collections::hash_map::Entry, mem};

use async_std::sync::Mutex;
use js_sys::{Promise, WebAssembly};
use tsify::Tsify;
use wasm_bindgen_futures::JsFuture;
use waw::serde::{Deserialize, Serialize};

use wasm_bindgen::{prelude::wasm_bindgen, JsCast, JsValue};

pub struct AudioData {
    pub id: String,
    pub data: Vec<f32>,
    pub sample_rate: f32,
}

#[wasm_bindgen]
pub struct SharedAudio(Arc<AudioData>);

impl Clone for SharedAudio {
    fn clone(&self) -> Self {
        Self(self.0.clone())
    }
}

impl SharedAudio {
    pub fn pack(self) -> usize {
        Box::into_raw(Box::new(self)) as usize
    }
    pub unsafe fn unpack(val: usize) -> Self {
        *Box::from_raw(val as *mut _)
    }
}

#[wasm_bindgen]
impl SharedAudio {
    #[wasm_bindgen(getter)]
    pub fn data(&mut self) -> js_sys::Float32Array {
        let buffer = wasm_bindgen::memory()
            .dyn_into::<WebAssembly::Memory>()
            .unwrap()
            .buffer();
        let data_ptr = self.data.as_ptr() as u32 / mem::size_of::<f32>() as u32;
        let data_length = self.data.len() as u32;

        js_sys::Float32Array::new_with_byte_offset_and_length(&buffer, data_ptr * 4, data_length)
    }

    pub fn cloned(&self) -> Self {
        self.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn id(&self) -> String {
        self.id.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn sample_rate(&self) -> f32 {
        self.sample_rate
    }
}

impl Deref for SharedAudio {
    type Target = AudioData;

    fn deref(&self) -> &Self::Target {
        self.0.as_ref()
    }
}

impl From<AudioDataTransport> for SharedAudio {
    fn from(value: AudioDataTransport) -> Self {
        let data: Vec<f32> = bytemuck::cast_slice(&value.bytes).to_vec();

        let arc_data = Arc::new(AudioData {
            id: value.id,
            data,
            sample_rate: value.sample_rate,
        });

        Self(arc_data)
    }
}

// The audio data is transferred as bytes using `Float32Array.buffer` and converted
// back to Vec<f32> on the Rust side. This is 100x faster than Serializing / Deserializing Vec<f32> data.
#[derive(Clone, Serialize, Deserialize, Tsify)]
#[serde(crate = "waw::serde")]
#[tsify(into_wasm_abi, from_wasm_abi)]
pub struct AudioDataTransport {
    id: String,
    #[tsify(type = "ArrayBuffer")]
    #[serde(with = "serde_bytes")]
    bytes: Vec<u8>,
    sample_rate: f32,
}

#[wasm_bindgen]
#[derive(Default)]
pub struct MediaManager {
    storage: Mutex<HashMap<String, SharedAudio>>,
}

#[wasm_bindgen(typescript_custom_section)]
const AUDIO_PROVIDER: &'static str = r#"
  type AudioProvider = () => Promise<AudioDataTransport>
"#;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(typescript_type = "AudioProvider")]
    pub type AudioProvider;
}

#[wasm_bindgen]
impl MediaManager {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Default::default()
    }

    /// Populates in memory cache with audio from the provider. Returns cached audio.
    pub async fn load_with(&self, uuid: &str, provider: AudioProvider) -> SharedAudio {
        let get_audio_data = || async {
            let provider_fn = provider.unchecked_into::<js_sys::Function>();
            let promise: Promise = provider_fn.call0(&JsValue::NULL).unwrap().into();
            let data = JsFuture::from(promise).await.unwrap();
            AudioDataTransport::from_js(data).unwrap()
        };

        let mut store = self.storage.lock().await;

        match store.entry(uuid.to_string()) {
            Entry::Occupied(entry) => entry.get().clone(),
            Entry::Vacant(entry) => {
                let transport = get_audio_data().await;
                entry.insert(transport.into()).clone()
            }
        }
    }
}
