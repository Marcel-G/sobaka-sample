use std::sync::Arc;

use jsonrpc_core::{Result, Error};
use jsonrpc_pubsub::{Session, typed::Subscriber};
use petgraph::graph::EdgeIndex;

pub mod interface;

use crate::{
    interface::{address::Address, message::SobakaMessage}, module::AudioModuleType,
    utils::subscriptions::Subscriptions, AudioProcessor,
};

use self::interface::SobakaGraphRpc;

pub struct AudioProcessorRpc {
    processor: AudioProcessor,
    subscriptions: Subscriptions,
}

impl AudioProcessorRpc {
    pub fn new(processor: AudioProcessor) -> Self {
        Self {
            processor,
            subscriptions: Default::default()
        }
    }
}

impl SobakaGraphRpc for AudioProcessorRpc {
    type Metadata = Arc<Session>;

    // @todo refactor Net to:
    //  - accept a graph as arg
    //  - or use graph with Nodes implementing AudioModule + AudioUnit32
    fn create(&self, node: AudioModuleType) -> Result<Address> {
      self.processor.create(node).map_err(|_| Error::invalid_request())
    }

    fn dispose(&self, address: Address) -> Result<bool> {
      self.processor.dispose(address).map_err(|_| Error::invalid_request())
    }

    fn connect(&self, from: Address, to: Address) -> Result<usize> {
      self.processor.connect(from, to).map_err(|_| Error::invalid_request())
    }

    fn disconnect(&self, id: usize) -> Result<bool> {
      self.processor.disconnect(EdgeIndex::new(id)).map_err(|_| Error::invalid_request())
    }

    fn message(&self, message: SobakaMessage) -> Result<bool> {
      self.processor.message(message).map_err(|_| Error::invalid_request())
    }

    fn subscribe(&self, meta: Self::Metadata, subscriber: Subscriber<SobakaMessage>) {
        // let graph = &mut self.graph.lock().expect("Cannot lock graph");
        // if let Some(module) = graph.get_audio_node(NodeIndex::new(node_id)) {
        // if let Ok(future) = module.observe() {
        //     self.subscriptions.add(subscriber, move |sink| {
        //         future
        //             .map(|res| Ok(Ok(res)))
        //             .forward(
        //                 sink.sink_map_err(|e| panic!("Error sending notifications: {:?}", e)),
        //             )
        //             .map(|_| ())
        //     });
        // } else {
        //     subscriber
        //         .reject(Error {
        //             code: ErrorCode::ParseError,
        //             message: "Node not subscribable. Subscription rejected.".into(),
        //             data: None,
        //         })
        //         .unwrap();
        // }
        // } else {
        //     subscriber
        //         .reject(Error {
        //             code: ErrorCode::InvalidParams,
        //             message: "No module found. Subscription rejected.".into(),
        //             data: None,
        //         })
        //         .unwrap();
        // }
    }

    fn unsubscribe(
        &self,
        _meta: Option<Self::Metadata>,
        subscription: jsonrpc_pubsub::SubscriptionId,
    ) -> Result<bool> {
        Ok(self.subscriptions.cancel(subscription))
    }
}

#[cfg(test)]
mod tests {
    use fundsp::hacker32::{U1, U2};
    use futures::channel::mpsc;
    use jsonrpc_pubsub::{PubSubHandler, Session};
    use std::sync::{Arc, Mutex};

    use crate::AudioProcessor;

    use super::{AudioProcessorRpc, interface::SobakaGraphRpc};

    fn build_rpc() -> (PubSubHandler<Arc<Session>>, Arc<Session>) {
        let mut handler = PubSubHandler::default();

        let rpc = AudioProcessorRpc {
            processor: AudioProcessor::new(44100.0),
            subscriptions: Default::default(),
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
