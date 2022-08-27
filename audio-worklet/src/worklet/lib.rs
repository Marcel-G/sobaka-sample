use context::GeneralContext;
use fundsp::{
    hacker::AudioUnit32,
    hacker32::{U1, U3},
    DEFAULT_SR,
};
use graph::{Graph32, NodeIndex};
use interface::{
    address::{Address, Port},
    error::SobakaError,
};
use module::{AudioModuleCommand, AudioModuleEvent, AudioModuleType, ModuleUnit};
use petgraph::graph::EdgeIndex;
use std::sync::{Arc, Mutex, MutexGuard};
use utils::observer::Observer;

pub mod context;
pub mod dsp;
pub mod graph;
pub mod module;
pub mod rpc;

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
    pub fn new() -> Self {
        let graph = Graph32::new::<U1, U3>();

        AudioProcessor {
            graph: Arc::new(Mutex::new(graph)),
            sample_rate: DEFAULT_SR,
        }
    }

    pub fn set_sample_rate(&mut self, sample_rate: f64) {
        self.sample_rate = sample_rate;
        self.graph.lock().unwrap().reset(Some(sample_rate));
    }

    pub fn graph(&self) -> SharedGraph {
        self.graph.clone()
    }

    pub fn graph_mut(&self) -> SobakaResult<MutexGuard<Graph32>> {
        self.graph.lock().map_err(|_| SobakaError::Something)
    }

    pub fn create(&self, node: AudioModuleType) -> SobakaResult<Address> {
        let (mut unit, context): (ModuleUnit, GeneralContext) = (&node).into(); // @todo there is probably a more semantic way to do this trait to use

        // Reset `sample_rate` after construction because some
        // AudioNodes in fundsp reset `sample_rate` to default when constructed
        // @todo this should be adjusted in fundsp
        unit.reset(Some(self.sample_rate));

        let address: Address = self.graph_mut()?.add(unit, context).into();

        match node {
            AudioModuleType::Scope(_) => {
                // Connect scope output to global output
                // This channel is not piped to audio output, just used for processing the graph.
                self.graph_mut()?
                    .connect_output(address.clone().into(), 0, 2);
            }
            AudioModuleType::Output => {
                // Connect left and right channels to global output
                self.graph_mut()?
                    .connect_output(address.clone().into(), 0, 0);
                self.graph_mut()?
                    .connect_output(address.clone().into(), 1, 1);
            }
            _ => {}
        }

        Ok(address)
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

    fn subscribe(&self, node: Address) -> SobakaResult<Observer<AudioModuleEvent>> {
        match node {
            Address { id: _, port: None } => {
                self.graph_mut()?
                    .get_mod(node.into())
                    // Module not found
                    .ok_or(SobakaError::Something)?
                    .context
                    .try_observe()
                    // Module does not support subscription
                    .map_err(|_| SobakaError::Something)
            }
            _ => {
                // Bad address
                Err(SobakaError::Something)
            }
        }
    }

    pub fn disconnect(&self, id: EdgeIndex) -> SobakaResult<bool> {
        Ok(self.graph_mut()?.disconnect(id))
    }

    pub fn message(&self, address: Address, message: AudioModuleCommand) -> SobakaResult<bool> {
        self.graph_mut()?
            .get_mod(address.into())
            // Node cannot be found
            .ok_or(SobakaError::Something)?
            .context
            .try_notify(message)
            // Node does not support sending
            .map_err(|_| SobakaError::Something)?;

        Ok(true) // @todo - confirmation that message was handled / matched?
    }
}
