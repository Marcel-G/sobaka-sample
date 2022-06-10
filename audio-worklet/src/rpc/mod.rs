use std::sync::Arc;

use futures::{FutureExt, SinkExt, StreamExt};
use jsonrpc_core::{Error, ErrorCode, Result};
use jsonrpc_pubsub::{manager::SubscriptionManager, typed::Subscriber, Session, SubscriptionId};
use petgraph::graph::EdgeIndex;

pub mod interface;

use crate::{
    interface::{address::Address, message::SobakaMessage},
    module::AudioModuleType,
    utils::{id_provider::AtomicIdProvider, wasm_executer::WasmSpawner},
    AudioProcessor,
};

use self::interface::SobakaGraphRpc;

pub struct AudioProcessorRpc {
    processor: AudioProcessor,
    subscriptions: SubscriptionManager<AtomicIdProvider>,
}

impl AudioProcessorRpc {
    pub fn new(processor: AudioProcessor) -> Self {
        let executor = WasmSpawner::new();

        Self {
            processor,
            subscriptions: SubscriptionManager::with_id_provider(
                AtomicIdProvider::default(),
                Arc::new(executor),
            ),
        }
    }
}

impl SobakaGraphRpc for AudioProcessorRpc {
    type Metadata = Arc<Session>;

    fn create(&self, node: AudioModuleType) -> Result<Address> {
        self.processor
            .create(node)
            .map_err(|_| Error::invalid_request())
    }

    fn dispose(&self, address: Address) -> Result<bool> {
        self.processor
            .dispose(address)
            .map_err(|_| Error::invalid_request())
    }

    fn connect(&self, from: Address, to: Address) -> Result<usize> {
        self.processor
            .connect(from, to)
            .map_err(|_| Error::invalid_request())
    }

    fn disconnect(&self, id: usize) -> Result<bool> {
        self.processor
            .disconnect(EdgeIndex::new(id))
            .map_err(|_| Error::invalid_request())
    }

    fn message(&self, message: SobakaMessage) -> Result<bool> {
        self.processor
            .message(message)
            .map_err(|_| Error::invalid_request())
    }

    fn subscribe(
        &self,
        _meta: Self::Metadata,
        subscriber: Subscriber<SobakaMessage>,
        node: Address,
    ) {
        match self
            .processor
            .subscribe(node)
            .map_err(|_| Error::invalid_request())
        {
            Ok(stream) => {
                self.subscriptions.add(subscriber, |sink| {
                    stream
                        .map(|res| Ok(Ok(res)))
                        .forward(
                            sink
                                // Failed to send message back to subscriber
                                .sink_map_err(|e| panic!("Error sending notifications: {:?}", e)),
                        )
                        .map(|_| ())
                });
            }
            Err(_error) => {
                // Failed to subscribe
                subscriber
                    .reject(Error {
                        code: ErrorCode::ParseError,
                        message: "Node not subscribable. Subscription rejected.".into(),
                        data: None,
                    })
                    .unwrap();
            }
        }
    }

    fn unsubscribe(
        &self,
        _meta: Option<Self::Metadata>,
        subscription_id: SubscriptionId,
    ) -> Result<bool> {
        Ok(self.subscriptions.cancel(subscription_id))
    }
}

#[cfg(test)]
mod tests {
    use futures::{channel::mpsc, executor::ThreadPool};
    use jsonrpc_pubsub::{manager::SubscriptionManager, PubSubHandler, Session};
    use std::sync::Arc;

    use crate::{utils::id_provider::AtomicIdProvider, AudioProcessor};

    use super::{interface::SobakaGraphRpc, AudioProcessorRpc};

    fn build_rpc() -> (PubSubHandler<Arc<Session>>, Arc<Session>) {
        let mut handler = PubSubHandler::default();

        let executor = ThreadPool::new().unwrap();

        let rpc = AudioProcessorRpc {
            processor: AudioProcessor::new(44100.0),
            subscriptions: SubscriptionManager::with_id_provider(
                AtomicIdProvider::default(),
                Arc::new(executor),
            ),
        };

        handler.extend_with(rpc.to_delegate());

        let (tx, _rx) = mpsc::unbounded();

        let meta = Arc::new(Session::new(tx));
        (handler, meta)
    }

    #[test]
    fn test_module_creation() {
        let (handler, meta) = build_rpc();
        let request = r#"{"jsonrpc":"2.0","id":1,"method":"create","params":[{ "node_type": "Oscillator", "data": { "saw": 0.25, "sine": 0.25, "square": 0.25, "triangle": 0.25 }}]}"#;
        let response = handler.handle_request_sync(request, meta);

        let expected = r#"{"jsonrpc":"2.0","result":"/sobaka/2","id":1}"#;

        assert_eq!(response, Some(expected.to_owned()));
    }

    #[test]
    fn test_module_connect() {
        let (handler, meta) = build_rpc();
        let request = r#"{"jsonrpc":"2.0","id":1,"method":"connect","params":["/sobaka/0/out-0", "/sobaka/1/in-0"]}"#;
        let response = handler.handle_request_sync(request, meta);

        let expected = r#"{"jsonrpc":"2.0","result":0,"id":1}"#;

        assert_eq!(response, Some(expected.to_owned()));
    }
}
