use async_std::sync::Arc;
use futures::channel::mpsc::UnboundedSender;
use jsonrpc_core::middleware::Noop;
use jsonrpc_pubsub::{PubSubHandler, Session};
use sobaka_sample_audio_core::graph::AudioGraph;

use crate::graph_rpc::api::SobakaGraphRpc;
use crate::subscriptions::Subscriptions;
use crate::utils::post_message_transport::PostMessageTransport;
use std::cell::RefCell;
use std::rc::Rc;
use std::sync::Mutex;
use web_sys::MessagePort;

pub struct RpcImpl {
    pub subscriptions: Subscriptions,
    pub graph: Arc<Mutex<AudioGraph>>,
}

impl RpcImpl {
    pub fn new(graph: Arc<Mutex<AudioGraph>>) -> Self {
        Self {
            subscriptions: Default::default(),
            graph,
        }
    }
}

pub type Messenger = Rc<RefCell<PostMessageTransport<Noop, Arc<Session>>>>;

pub fn connect(port: MessagePort, core: Arc<Mutex<AudioGraph>>) -> Messenger {
    // Setup RPC
    let mut io = PubSubHandler::default();
    let rpc = RpcImpl::new(core);

    io.extend_with(rpc.to_delegate());

    // Metadata should be created on connection
    // No connection is made in this case
    // unsure how futures work so this may be broken
    let metadata_extractor =
        |sender: &UnboundedSender<String>| Arc::new(Session::new(sender.clone()));

    PostMessageTransport::connect(io, metadata_extractor, port)
}
