use fundsp::{
    hacker::AudioUnit32,
    hacker32::{U1, U2},
};
use futures::Stream;
use graph::{Graph32, NodeIndex};
use interface::{
    address::{Address, Port},
    error::SobakaError,
    message::SobakaMessage,
};
use module::{AudioModule32, AudioModuleType};
use petgraph::graph::EdgeIndex;
use std::{
    pin::Pin,
    sync::{Arc, Mutex, MutexGuard},
};
use utils::observer::{Observable, Observer, Producer};

pub mod dsp;
pub mod graph;
pub mod module;
pub mod rpc;

mod get_random;
pub mod interface;
pub mod utils;
pub mod worklet;

type SharedGraph = Arc<Mutex<Graph32>>;
// AudioProcessor is the rust entry-point for Web Audio AudioWorkletProcessor
pub struct AudioProcessor {
    graph: SharedGraph,
    sample_rate: f64,
}

pub type SobakaResult<T> = Result<T, SobakaError>;

impl AudioProcessor {
    pub fn new(sample_rate: f64) -> Self {
        let mut graph = Graph32::new::<U1, U2>();

        graph.reset(Some(sample_rate));

        AudioProcessor {
            graph: Arc::new(Mutex::new(graph)),
            sample_rate,
        }
    }

    pub fn graph(&self) -> SharedGraph {
        self.graph.clone()
    }

    fn graph_mut(&self) -> SobakaResult<MutexGuard<Graph32>> {
        self.graph.lock().map_err(|_| SobakaError::Something)
    }

    pub fn create(&self, node: AudioModuleType) -> SobakaResult<Address> {
        let mut unit: Box<dyn AudioModule32 + Send> = node.into();

        // Reset `sample_rate` after construction because some
        // AudioNodes in fundsp reset `sample_rate` to default when constructed
        // @todo this should be adjusted in fundsp
        unit.reset(Some(self.sample_rate));

        Ok(self.graph_mut()?.add(unit).into())
    }

    pub fn dispose(&self, address: Address) -> SobakaResult<bool> {
        if let Some(_port) = address.port {
            // Port should not be specified when targeting modules directly
            return Err(SobakaError::Something);
        }

        let id: NodeIndex = address.into();

        Ok(self.graph_mut()?.remove(id))
    }

    pub fn connect(&self, from: Address, to: Address) -> SobakaResult<usize> {
        let from_port = match from {
            Address {
                id: _from_id,
                port: Some(Port::Output(output)),
            } => {
                let outputs = self
                    .graph_mut()?
                    .get_mod(from.clone().into())
                    // Node cannot be found
                    .ok_or(SobakaError::Something)?
                    .outputs();

                if output >= outputs {
                    // Output is out of range
                    Err(SobakaError::Something)
                } else {
                    Ok(output)
                }
            }
            // Expecting from to target output port
            _ => Err(SobakaError::Something),
        }?;

        let to_port = match to {
            Address {
                id: _to_id,
                port: Some(Port::Input(input)),
            } => {
                let inputs = self
                    .graph_mut()?
                    .get_mod(to.clone().into())
                    // Node cannot be found
                    .ok_or(SobakaError::Something)?
                    .inputs();

                if input >= inputs {
                    // Input is out of range
                    Err(SobakaError::Something)
                } else {
                    Ok(input)
                }
            }
            // Expecting to to target output port
            _ => Err(SobakaError::Something),
        }?;

        Ok(self
            .graph_mut()?
            .connect(from.into(), from_port, to.into(), to_port)
            .index())
    }

    fn subscribe(&self, node: Address) -> SobakaResult<Observer<SobakaMessage>> {
        match node {
            Address { id: _, port: None } => {
                self.graph_mut()?
                    .get_mod(node.clone().into())
                    // Module not found
                    .ok_or(SobakaError::Something)?
                    .unit
                    .get_receiver()
                    .ok_or(SobakaError::Something)
            }
            _ => {
                //
                Err(SobakaError::Something)
            }
        }
    }

    pub fn disconnect(&self, id: EdgeIndex) -> SobakaResult<bool> {
        Ok(self.graph_mut()?.disconnect(id))
    }

    pub fn message(&self, message: SobakaMessage) -> SobakaResult<bool> {
        match message.addr.port {
            Some(Port::Parameter(_)) => Ok(()),
            // Port must be targeting a parameter
            _ => Err(SobakaError::Something),
        }?;

        self.graph_mut()?
            .get_mod_mut(message.addr.clone().into())
            // Node cannot be found
            .ok_or(SobakaError::Something)?
            .unit
            .get_sender()
            // Node does not support sending
            .ok_or(SobakaError::Something)?
            .notify(message);

        Ok(true) // @todo - confirmation that message was handled / matched?
    }
}
