use async_std::{future::ready, task::spawn_local};
use fundsp::hacker::*;
use futures::StreamExt;

use crate::utils::observer::{Observable, Observer, Subject};

use super::shared::Shared;
pub trait MessageHandler<X> {
    /// The message handler provides a means to receive messages incoming
    /// messages. The handler gets a mutable reference to the `AudioNode`
    /// And can mutate it to change the state of the node.
    fn message_handler<F, M>(self, message_fn: F) -> Subject<M>
    where
        M: Clone + Send + 'static,
        X: AudioNode + 'static,
        F: Fn(&mut X, M) + 'static;
}

impl<X> MessageHandler<X> for Shared<X>
where
    X: AudioNode,
{
    fn message_handler<F, M>(self, message_fn: F) -> Subject<M>
    where
        M: Clone + Send + 'static,
        X: AudioNode + 'static,
        F: Fn(&mut X, M) + 'static,
    {
        let handler = Subject::new();

        spawn_local(handler.observe().for_each(move |message: M| {
            let mut unit = self.lock();
            message_fn(&mut unit, message);
            ready(())
        }));

        handler
    }
}

impl<X> Observable for Shared<X>
where
    X: AudioNode + Observable,
{
    type Output = X::Output;

    fn observe(&self) -> Observer<Self::Output> {
        self.lock().observe()
    }
}
