use std::rc::Rc;

use async_std::{future::ready, task::spawn_local};
use futures::{
    channel::mpsc::{self, UnboundedSender},
    StreamExt,
};
use js_sys::JSON;
use jsonrpc_core::{MetaIoHandler, Middleware};
use jsonrpc_pubsub::PubSubMetadata;
use wasm_bindgen::{prelude::Closure, JsCast};
use web_sys::{MessageEvent, MessagePort};

pub struct PostMessageTransport<S, M>
where
    M: PubSubMetadata,
    S: Middleware<M>,
{
    handler: MetaIoHandler<M, S>,
    port: MessagePort,
}

impl<S, M> PostMessageTransport<S, M>
where
    M: PubSubMetadata,
    S: Middleware<M>,
{
    pub fn new<T>(handler: T, port: MessagePort) -> Self
    where
        T: Into<MetaIoHandler<M, S>>,
    {
        Self {
            handler: handler.into(),
            port,
        }
    }

    pub fn start<F: FnOnce(UnboundedSender<String>) -> M>(self, func: F) {
        // Create channel for responding to subscriptions
        let (sender, receiver) = mpsc::unbounded();

        let shared_transport = Rc::new(self);

        // Create metadata, transport only supports a single session
        let metadata = func(sender);

        let sub_transport = shared_transport.clone();
        // Send outgoing messages to subscriptions from another task
        spawn_local(receiver.for_each(move |message| {
            sub_transport
                .port
                .post_message(&message.into())
                .expect("Failed to post message");

            ready(())
        }));

        let message_transport = shared_transport.clone();
        let handle_js_message: Closure<dyn Fn(MessageEvent)> =
            Closure::wrap(Box::new(move |message: MessageEvent| {
                let call_transport = message_transport.clone();
                let metadata = metadata.clone();

                spawn_local(async move {
                    // Get incoming message as string (is this making the data get parsed twice?)
                    let request: String = JSON::stringify(&message.data()) // not a real error: https://github.com/rust-lang/rust-analyzer/issues/5412
                        .expect("Encountered bad message")
                        .into();
                    // Handle the request via the rust RPC implementation
                    let response = call_transport
                        .handler
                        .handle_request(&request, metadata)
                        .await;

                    // Send response back to over the message port, if any.
                    if let Some(reply) = response {
                        call_transport.port.post_message(&reply.into()).unwrap();
                    }
                });
            }));

        // Attach handler to message port
        shared_transport
            .port
            .set_onmessage(Some(handle_js_message.as_ref().unchecked_ref()));

        // Prevent rust from dropping the closure (we'll keep this perminantly)
        handle_js_message.forget()
    }
}
