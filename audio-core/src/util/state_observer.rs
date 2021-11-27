use std::sync::Mutex;

use futures::channel::mpsc;

pub type Observer<S> = mpsc::UnboundedReceiver<S>;
pub type ObserverStorage<S> = Mutex<Vec<mpsc::UnboundedSender<S>>>;

pub trait ObserveState {
    type State;
    fn observers(&self) -> &ObserverStorage<Self::State>;
    fn to_state(&self) -> Self::State;

    fn notify(&self) {
        let mut sinks = self.observers().lock().unwrap();

        sinks.retain(|sink| sink.unbounded_send(self.to_state()).is_ok());
    }

    fn observe(&self) -> Observer<Self::State> {
        let (sink, stream) = mpsc::unbounded();
        self.observers().lock().unwrap().push(sink);
        // Notify of current state immediately on subscription
        self.notify();
        stream
    }
}
