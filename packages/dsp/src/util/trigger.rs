use fundsp::{
    prelude::*,
    thingbuf::mpsc::{channel, Receiver, Sender},
};
use wasm_bindgen::prelude::wasm_bindgen;

#[wasm_bindgen]
#[derive(Clone, Copy, PartialEq)]
pub enum GateEvent {
    Close = "close",
    Open = "open",
}

impl Default for GateEvent {
    fn default() -> Self {
        Self::Close
    }
}

pub struct Trigger {
    threshold: f32,
    is_open: bool,
    sender: Sender<GateEvent>,
}

impl Clone for Trigger {
    fn clone(&self) -> Self {
        Self {
            threshold: self.threshold,
            is_open: self.is_open,
            sender: self.sender.clone(),
        }
    }
}

impl Trigger {
    pub fn new(threshold: f32, sender: Sender<GateEvent>) -> Self {
        Self {
            threshold,
            is_open: false,
            sender,
        }
    }
}

impl AudioNode for Trigger {
    const ID: u64 = 56;
    type Inputs = U1;
    type Outputs = U1;

    fn reset(&mut self) {
        self.is_open = false;
        if self.sender.try_send(GateEvent::Close).is_ok() {};
    }

    #[inline]
    fn tick(&mut self, input: &Frame<f32, Self::Inputs>) -> Frame<f32, Self::Outputs> {
        if input[0] > self.threshold {
            if !self.is_open {
                self.is_open = true;
                if self.sender.try_send(GateEvent::Open).is_ok() {};
            }
        } else {
            if self.is_open {
                self.is_open = false;
                if self.sender.try_send(GateEvent::Close).is_ok() {};
            }
        }
        *input
    }

    fn route(&mut self, input: &SignalFrame, _frequency: f64) -> SignalFrame {
        input.clone()
    }
}

/// Trigger node. Passes through input. Emits a message when threshold is passed.
///
/// - Input 0: signal
/// - Output 0: signal
///
/// ### Example
/// ```
/// let (rx, module) = trigger(0.0);
/// ```
pub fn trigger(threshold: f32) -> (Receiver<GateEvent>, An<Trigger>) {
    let (sender, receiver) = channel(128);
    (receiver, An(Trigger::new(threshold, sender)))
}

pub fn trigger_tx(threshold: f32, tx: Sender<GateEvent>) -> An<Trigger> {
    An(Trigger::new(threshold, tx))
}
