pub mod api;

use std::{convert::TryInto, ops::DerefMut, sync::Arc};

use futures::{FutureExt, SinkExt, StreamExt};
use jsonrpc_core::{Error, ErrorCode, Result};
use jsonrpc_pubsub::{typed, Session, SubscriptionId};
use sobaka_sample_audio_core::{
    graph::EdgeIndex,
    modules::{
        clock::ClockModule,
        envelope::EnvelopeModule,
        oscillator::OscillatorModule,
        parameter::ParameterModule,
        sequencer::SequencerModule,
        sink::SinkModule,
        traits::{Module, StatefulModule},
        volume::VolumeModule,
        delay::DelayModule,
        AudioModule
    },
};

fn into_err(message: &str) -> Error {
    Error {
        code: ErrorCode::InvalidParams,
        message: message.into(),
        data: None,
    }
}

use self::api::{InputTypeDTO, ModuleRpc, ModuleStateDTO, ModuleType};
use crate::rpc::RpcImpl;

impl ModuleRpc for RpcImpl {
    type Metadata = Arc<Session>;

    fn create_module(
        &self,
        module_type: ModuleType,
        initial_state: Option<ModuleStateDTO>,
    ) -> Result<usize> {
        let mut module = match module_type {
            ModuleType::Clock => AudioModule::Clock(ClockModule::default()),
            ModuleType::Envelope => AudioModule::Envelope(EnvelopeModule::default()),
            ModuleType::Oscillator => AudioModule::Oscillator(OscillatorModule::default()),
            ModuleType::Parameter => AudioModule::Parameter(ParameterModule::default()),
            ModuleType::Sequencer => AudioModule::Sequencer(SequencerModule::default()),
            ModuleType::Sink => AudioModule::Sink(SinkModule::default()),
            ModuleType::Delay => AudioModule::Delay(DelayModule::default()),
            ModuleType::Volume => AudioModule::Volume(VolumeModule::default()),
        };

        let mut core = self.core.lock().expect("Cannot lock core");

        if let Some(state) = initial_state {
            match &mut module {
                AudioModule::Oscillator(oscillator) => StatefulModule::create(
                    oscillator,
                    &mut core.graph,
                    state.try_into().map_err(into_err)?,
                ),
                AudioModule::Parameter(parameter) => StatefulModule::create(
                    parameter,
                    &mut core.graph,
                    state.try_into().map_err(into_err)?,
                ),
                AudioModule::Sequencer(sequencer) => StatefulModule::create(
                    sequencer,
                    &mut core.graph,
                    state.try_into().map_err(into_err)?,
                ),
                _ => Err("Module does not support initial state").map_err(into_err)?,
            };
        } else {
            module.create(&mut core.graph);
        }

        let modules = &mut core.modules;

        let dumb_id = modules.len(); // @todo create uuids and put in a HashMap?
        modules.push(module);

        Ok(dumb_id)
    }

    fn dispose_module(&self, module_id: usize) -> Result<bool> {
        let mut core = self.core.lock().expect("Cannot lock core");
        let core_mut = core.deref_mut();

        if let Some(module) = core_mut.modules.get_mut(module_id) {
            module.dispose(&mut core_mut.graph);

            Ok(true)
        } else {
            Err(Error {
                code: ErrorCode::InvalidParams,
                message: "Module not found".into(),
                data: None,
            })
        }
    }

    fn update_module(&self, module_id: usize, state: ModuleStateDTO) -> Result<bool> {
        let core = &mut self.core.lock().expect("Cannot lock core");
        let core_mut = core.deref_mut();
        if let Some(module) = core_mut.modules.get_mut(module_id) {
            match module {
                AudioModule::Oscillator(oscillator) => StatefulModule::update(
                    oscillator,
                    &mut core_mut.graph,
                    state.try_into().map_err(into_err)?,
                ),
                AudioModule::Parameter(parameter) => StatefulModule::update(
                    parameter,
                    &mut core_mut.graph,
                    state.try_into().map_err(into_err)?,
                ),
                AudioModule::Sequencer(sequencer) => StatefulModule::update(
                    sequencer,
                    &mut core_mut.graph,
                    state.try_into().map_err(into_err)?,
                ),
                _ => Err("Module does not support state updates").map_err(into_err)?,
            };

            Ok(true)
        } else {
            Err(Error {
                code: ErrorCode::InvalidParams,
                message: "Module not found".into(),
                data: None,
            })
        }
    }

    fn subscribe_module(
        &self,
        _meta: Self::Metadata,
        subscriber: typed::Subscriber<ModuleStateDTO>,
        module_id: usize,
    ) {
        let core = &self.core.lock().expect("Cannot lock core");
        if let Some(module) = core.modules.get(module_id) {
            let result = match module {
                AudioModule::Oscillator(oscillator) => Ok(oscillator
                    .subscribe(&core.graph)
                    .expect("Could not subscribe") // @todo this should not be optional
                    .map(ModuleStateDTO::Oscillator)
                    .boxed()),
                AudioModule::Parameter(parameter) => Ok(parameter
                    .subscribe(&core.graph)
                    .expect("Could not subscribe") // @todo this should not be optional
                    .map(ModuleStateDTO::Parameter)
                    .boxed()),
                AudioModule::Sequencer(sequencer) => Ok(sequencer
                    .subscribe(&core.graph)
                    .expect("Could not subscribe") // @todo this should not be optional
                    .map(ModuleStateDTO::Sequencer)
                    .boxed()),
                _ => Err("Node does not support subscriptions"),
            };

            if let Ok(future) = result {
                self.subscriptions.add(subscriber, move |sink| {
                    future
                        .map(|res| Ok(Ok(res)))
                        .forward(
                            sink.sink_map_err(|e| panic!("Error sending notifications: {:?}", e)),
                        )
                        .map(|_| ())
                });
            } else {
                subscriber
                    .reject(Error {
                        code: ErrorCode::ParseError,
                        message: "Node not subscribable. Subscription rejected.".into(),
                        data: None,
                    })
                    .unwrap();
            }
        } else {
            subscriber
                .reject(Error {
                    code: ErrorCode::InvalidParams,
                    message: "No module found. Subscription rejected.".into(),
                    data: None,
                })
                .unwrap();
        }
    }

    fn unsubscribe_module(
        &self,
        _meta: Option<Self::Metadata>,
        subscription: SubscriptionId,
    ) -> Result<bool> {
        Ok(self.subscriptions.cancel(subscription))
    }

    fn connect_module(
        &self,
        module_id_a: usize,
        module_id_b: usize,
        input_name: InputTypeDTO,
    ) -> Result<usize> {
        let (output, input) = {
            let core = self.core.lock().expect("Cannot lock core");
            let module_a = core
                .modules
                .get(module_id_a)
                .ok_or("Module a not found")
                .map_err(into_err)?;
            let module_b = core
                .modules
                .get(module_id_b)
                .ok_or("Module b not found")
                .map_err(into_err)?;

            let output = module_a.output().expect("No output found");

            let input = match module_b {
                AudioModule::Clock(module) => {
                    module.input(&input_name.try_into().map_err(into_err)?)
                }
                AudioModule::Envelope(module) => {
                    module.input(&input_name.try_into().map_err(into_err)?)
                }
                AudioModule::Oscillator(module) => {
                    module.input(&input_name.try_into().map_err(into_err)?)
                }
                AudioModule::Sequencer(module) => {
                    module.input(&input_name.try_into().map_err(into_err)?)
                }
                AudioModule::Sink(module) => {
                    module.input(&input_name.try_into().map_err(into_err)?)
                }
                AudioModule::Volume(module) => {
                    module.input(&input_name.try_into().map_err(into_err)?)
                }
                AudioModule::Delay(module) => {
                    module.input(&input_name.try_into().map_err(into_err)?)
                }
                _ => None,
            };

            let input = input.ok_or("No input found").map_err(into_err)?;

            (output.node, input.node.expect("Input not initialised"))
        };

        let mut core = self.core.lock().expect("Cannot lock core");

        let edge = core.graph.add_edge(output, input);

        Ok(edge.index())
    }

    fn disconnect_module(&self, connection_id: usize) -> Result<bool> {
        let mut core = self.core.lock().expect("Could not lock core");

        core.graph.remove_edge(EdgeIndex::new(connection_id));

        Ok(true)
    }
}
