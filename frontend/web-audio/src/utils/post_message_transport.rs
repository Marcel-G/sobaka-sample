use std::{cell::RefCell, pin::Pin, rc::Rc, task::{Context, Poll}};

use async_std::task;
use futures::{Future, channel::mpsc::{self, UnboundedSender}};
use jsonrpc_core::{ MetaIoHandler, Result };
use wasm_bindgen::{JsCast, prelude::Closure};
use web_sys::{MessageEvent, MessagePort};

struct SenderFuture(
    Box<dyn Fn(String) -> Result<()>>,
    Box<dyn futures::Stream<Item = String> + Send + Unpin>,
);

impl Future for SenderFuture {
    type Output = ();

    fn poll(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output> {
        use futures::Stream;

        let this = Pin::into_inner(self);
        loop {
            match Pin::new(&mut this.1).poll_next(cx) {
                Poll::Pending => return Poll::Pending,
                Poll::Ready(None) => return Poll::Ready(()),
                Poll::Ready(Some(val)) => {
                    if let Err(_) = (this.0)(val) {
                        return Poll::Ready(());
                    }
                }
            }
        }
    }
}

pub struct PostMessageTransport<S, M>
where
    M: jsonrpc_core::Metadata,
    S: jsonrpc_core::Middleware<M>,
{
    handler: jsonrpc_core::MetaIoHandler<M, S>,
    port: MessagePort,
    callback: Option<Closure<dyn Fn(MessageEvent)>>,
    metadata: Option<M>,
}

impl<S, M> PostMessageTransport<S, M>
where
    M: jsonrpc_core::Metadata,
    S: jsonrpc_core::Middleware<M>,
{
    pub fn connect<T, F>(handler: T, metadata_extractor: F, port: MessagePort) -> Rc<RefCell<Self>>
    where
        T: Into<MetaIoHandler<M, S>>,
        F: Fn(&UnboundedSender<String>) -> M,
    {
        let messenger = Rc::new(RefCell::new(Self {
            handler: handler.into(),
            port,
            metadata: None,
            callback: None,
        }));

        // This sends out to subscriptions
        let (sender, receiver) = mpsc::unbounded();

        let messenger_1 = messenger.clone();
        task::spawn_local(SenderFuture(
            Box::new(move |message| {
                messenger_1
                    .borrow()
                    .port
                    .post_message(&message.into())
                    .expect("Failed to post message");
                Ok(())
            }),
            Box::new(receiver),
        ));

        messenger.borrow_mut().metadata = Some((metadata_extractor)(&sender));

        let messenger_2 = messenger.clone();

        let callback = Closure::wrap(Box::new(move |message| {
            let messenger_3 = messenger_2.clone();
            task::spawn_local(async move {
                messenger_3.borrow().on_message(message).await;
            });
        }) as Box<dyn Fn(MessageEvent)>);

        messenger
            .borrow()
            .port
            .set_onmessage(Some(callback.as_ref().unchecked_ref()));

        messenger.borrow_mut().callback = Some(callback);

        messenger
    }

    async fn on_message(&self, message: MessageEvent) {
        // Get incoming message as string
        let req: String = js_sys::JSON::stringify(&message.data())
            .expect("Encountered bad message")
            .into();

        // This processes and responds to incoming requests
        let response = self
            .handler
            .handle_request(
                &req,
                self.metadata.as_ref().expect("Metadata should be set on initialisation").clone()
            ).await;

        if let Some(reply) = response {
            self.port.post_message(&reply.into()).unwrap();
        }
    }
}