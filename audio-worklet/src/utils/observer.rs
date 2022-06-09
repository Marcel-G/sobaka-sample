use futures::{channel::mpsc, Stream, StreamExt};
use std::{pin::Pin, sync::Mutex};

pub type BoxedObservable<S> = Pin<Box<dyn Observable<Output = S> + Send>>;
pub type Observer<S> = Pin<Box<dyn Stream<Item = S> + Send>>;
pub type ObserverStorage<S> = Mutex<Vec<mpsc::UnboundedSender<S>>>;

/// An `Observable` is something that can produce a stream of values.
pub trait Observable {
    type Output: Clone;
    /// Observe returns a new stream of values produced by the `Observable`.
    fn observe(&self) -> Observer<Self::Output>;

    /// Observable values can be mapped from one type to another.
    /// This map will be applied to any Observer streams created from the Observable.
    fn map<F, T>(self, f: F) -> Map<Self, F>
    where
        T: Clone,
        F: Fn(Self::Output) -> T + 'static,
        Self: Sized,
    {
        Map { source: self, f }
    }
}

/// Producer is used to push new values into the Observers.
/// Events are only delivered if observers are listening, otherwise they are dropped.
pub trait Producer: Observable {
    fn notify(&self, event: Self::Output);
}

pub struct Map<S, F>
where
    S: Observable,
{
    source: S,
    f: F,
}

impl<S, F, T> Observable for Map<S, F>
where
    T: Clone,
    S: Observable,
    S::Output: 'static,
    F: Fn(S::Output) -> T + Send + Clone + 'static,
{
    type Output = F::Output;

    fn observe(&self) -> Observer<Self::Output> {
        self.source.observe().map(self.f.clone()).boxed()
    }
}

pub struct Subject<T> {
    observers: ObserverStorage<T>,
}

impl<T> Subject<T> {
    pub fn new() -> Self {
        Self {
            observers: Mutex::new(Vec::new()),
        }
    }
}

impl <T> Default for Subject<T> {
    fn default() -> Self {
        Self::new()
    }
}

impl<T: Clone + Send + 'static> Observable for Subject<T> {
    type Output = T;
    fn observe(&self) -> Observer<Self::Output> {
        let (producer, consumer) = mpsc::unbounded();
        self.observers.lock().unwrap().push(producer);
        consumer.boxed()
    }
}

impl<T: Clone + Send + 'static> Producer for Subject<T> {
    fn notify(&self, event: Self::Output) {
        let mut sinks = self.observers.lock().unwrap();

        sinks.retain(|sink| sink.unbounded_send(event.clone()).is_ok());
    }
}
