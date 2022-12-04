pub type Callback<Event> = Box<dyn Fn(Event)>;
pub trait Emitter {
    type Event;
    fn add_event_listener_with_callback(&mut self, callback: Callback<Self::Event>);
}

pub trait Handler {
    type Event;
    fn handle(&mut self, event: Self::Event);
}
