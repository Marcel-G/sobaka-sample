pub mod api;

use std::{convert::TryInto, sync::Arc};

use futures::{FutureExt, SinkExt, StreamExt};
use jsonrpc_core::{Error, ErrorCode, Result};
use jsonrpc_pubsub::{typed, Session, SubscriptionId};
use sobaka_sample_audio_core::{
    graph::{EdgeIndex, NodeIndex},
    node::{
        delay::DelayNode, envelope::EnvelopeNode, oscillator::OscillatorNode,
        parameter::ParameterNode, sequencer::SequencerNode, sink::SinkNode, sum::SumNode,
        volume::VolumeNode, AudioNode, EventNode, StatefulNode,
    },
};

fn into_err(message: &str) -> Error {
    Error {
        code: ErrorCode::InvalidParams,
        message: message.into(),
        data: None,
    }
}

use self::api::{NodeEventDTO, NodeInputTypeDTO, NodeStateDTO, NodeType, SobakaGraphRpc};
use crate::rpc::RpcImpl;

impl SobakaGraphRpc for RpcImpl {
    type Metadata = Arc<Session>;

    fn create_node(
        &self,
        node_type: NodeType,
        initial_state: Option<NodeStateDTO>,
    ) -> Result<usize> {
        let node: AudioNode = match (node_type, initial_state) {
            (NodeType::Oscillator, Some(state)) => {
                OscillatorNode::create(state.try_into().map_err(into_err)?).into()
            }
            (NodeType::Parameter, Some(state)) => {
                ParameterNode::create(state.try_into().map_err(into_err)?).into()
            }
            (NodeType::Sequencer, Some(state)) => {
                SequencerNode::create(state.try_into().map_err(into_err)?).into()
            }
            (NodeType::Envelope, _) => EnvelopeNode::default().into(),
            (NodeType::Delay, _) => DelayNode::default().into(),
            (NodeType::Volume, _) => VolumeNode::default().into(),
            (NodeType::Sink, _) => SinkNode::default().into(),
            (NodeType::Sum, _) => SumNode::default().into(),
            _ => todo!(),
        };

        let mut graph = self.graph.lock().expect("Cannot lock graph");

        let id = graph.add_node(node);

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

    fn update_node(&self, node_id: usize, state: NodeStateDTO) -> Result<bool> {
        let graph = &mut self.graph.lock().expect("Cannot lock graph");
        if let Some(node) = graph.get_audio_node_mut(NodeIndex::new(node_id)) {
            match node {
                AudioNode::Oscillator(node) => node.update(state.try_into().map_err(into_err)?),
                AudioNode::Parameter(node) => node.update(state.try_into().map_err(into_err)?),
                AudioNode::Sequencer(node) => node.update(state.try_into().map_err(into_err)?),
                _ => Err("Module does not support state updates").map_err(into_err)?,
            };

            Ok(true)
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
        subscriber: typed::Subscriber<NodeEventDTO>,
        node_id: usize,
    ) {
        let graph = &self.graph.lock().expect("Cannot lock graph");
        if let Some(module) = graph.get_audio_node(NodeIndex::new(node_id)) {
            let result = match module {
                AudioNode::Sequencer(node) => {
                    Ok(node.observe().map(NodeEventDTO::Sequencer).boxed())
                }
                _ => Err("Node does not support subscriptions"),
            };

            if let Ok(future) = result {
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
        input_name: NodeInputTypeDTO,
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
                &input_name,
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
