pub mod api;

use std::sync::Arc;

use futures::{FutureExt, SinkExt, StreamExt};
use jsonrpc_core::{Error, ErrorCode, Result};
use jsonrpc_pubsub::{typed, Session, SubscriptionId};
use sobaka_sample_audio_core::{
    graph::{EdgeIndex, NodeIndex},
    node::{AudioNode, AudioNodeEvent, AudioNodeInput, AudioNodeState, StatefulNode},
};

fn into_err<T: ToString>(message: T) -> Error {
    Error {
        code: ErrorCode::InvalidParams,
        message: message.to_string(),
        data: None,
    }
}

use self::api::SobakaGraphRpc;
use crate::rpc::RpcImpl;

impl SobakaGraphRpc for RpcImpl {
    type Metadata = Arc<Session>;

    fn create_node(&self, node_state: AudioNodeState) -> Result<usize> {
        let mut graph = self.graph.lock().expect("Cannot lock graph");

        let sr = graph.sample_rate;

        let id = graph.add_node(AudioNode::create(node_state, sr));

        Ok(id.index())
    }

    fn dispose_node(&self, node_id: usize) -> Result<bool> {
        let mut graph = self.graph.lock().expect("Cannot lock graph");

        if graph.remove_node(NodeIndex::new(node_id)).is_some() {
            Ok(true)
        } else {
            Err(Error {
                code: ErrorCode::InvalidParams,
                message: "Module not found".into(),
                data: None,
            })
        }
    }

    fn update_node(&self, node_id: usize, node_state: AudioNodeState) -> Result<bool> {
        let graph = &mut self.graph.lock().expect("Cannot lock graph");
        if let Some(node) = graph.get_audio_node_mut(NodeIndex::new(node_id)) {
            node.update(node_state).map(|_| true).map_err(into_err)
        } else {
            Err(Error {
                code: ErrorCode::InvalidParams,
                message: "Module not found".into(),
                data: None,
            })
        }
    }

    fn subscribe_node(
        &self,
        _meta: Self::Metadata,
        subscriber: typed::Subscriber<AudioNodeEvent>,
        node_id: usize,
    ) {
        let graph = &self.graph.lock().expect("Cannot lock graph");
        if let Some(module) = graph.get_audio_node(NodeIndex::new(node_id)) {
            if let Ok(future) = module.observe() {
                self.subscriptions.add(subscriber, move |sink| {
                    future
                        .map(|res| Ok(Ok(res)))
                        .forward(
                            sink.sink_map_err(|e| panic!("Error sending notifications: {:?}", e)),
                        )
                        .map(|_| ())
                });
            } else {
                subscriber
                    .reject(Error {
                        code: ErrorCode::ParseError,
                        message: "Node not subscribable. Subscription rejected.".into(),
                        data: None,
                    })
                    .unwrap();
            }
        } else {
            subscriber
                .reject(Error {
                    code: ErrorCode::InvalidParams,
                    message: "No module found. Subscription rejected.".into(),
                    data: None,
                })
                .unwrap();
        }
    }

    fn unsubscribe_node(
        &self,
        _meta: Option<Self::Metadata>,
        subscription: SubscriptionId,
    ) -> Result<bool> {
        Ok(self.subscriptions.cancel(subscription))
    }

    fn connect_node(
        &self,
        node_id_a: usize,
        node_id_b: usize,
        input_name: AudioNodeInput,
    ) -> Result<usize> {
        if node_id_a == node_id_b {
            return Err(Error {
                code: ErrorCode::InvalidParams,
                message: "Cannot connect the same nodes".into(),
                data: None,
            });
        }

        let mut graph = self.graph.lock().expect("Cannot lock graph");

        let edge = graph
            .add_edge(
                NodeIndex::new(node_id_a),
                NodeIndex::new(node_id_b),
                input_name,
            )
            .map_err(into_err)?;

        Ok(edge.index())
    }

    fn disconnect_node(&self, connection_id: usize) -> Result<bool> {
        let mut graph = self.graph.lock().expect("Could not lock graph");

        graph.remove_edge(EdgeIndex::new(connection_id));

        Ok(true)
    }
}
