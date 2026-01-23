import { ClockNode } from "./clock/node";
import { OscillatorNode } from "./oscillator/node";
import { NoiseNode } from "./noise/node";
import { FilterNode } from "./filter/node";
import { EnvelopeNode } from "./envelope/node";
import { DelayNode } from "./delay/node";
import { ReverbNode } from "./reverb/node";
import { QuantiserNode } from "./quantiser/node";
import { ParameterNode } from "./parameter/node";
import { VcaNode } from "./vca/node";
import { ScopeNode } from "./scope/node";
import { LfoNode } from "./lfo/node";
import { EuclideanNode } from "./euclidean/node";
import { Module } from "@sobaka/state";
import { ModuleDSP } from "../shared";

// TODO - refactor to be more of a plugin system

/**
 * Creates a DSP instance for a given module
 * This should be implemented to instantiate the appropriate module type
 */
export const createAudioModule = (module: Module, audioContext: AudioContext): ModuleDSP => {
  if (module.type === 'Clock') return new ClockNode(module.id, audioContext, module.state as any)
  if (module.type === 'Oscillator') return new OscillatorNode(module.id, audioContext, module.state as any)
  if (module.type === 'Noise') return new NoiseNode(module.id, audioContext, module.state as any)
  if (module.type === 'Filter') return new FilterNode(module.id, audioContext, module.state as any)
  if (module.type === 'Envelope') return new EnvelopeNode(module.id, audioContext, module.state as any)
  if (module.type === 'Delay') return new DelayNode(module.id, audioContext, module.state as any)
  if (module.type === 'Reverb') return new ReverbNode(module.id, audioContext, module.state as any)
  if (module.type === 'Quantiser') return new QuantiserNode(module.id, audioContext, module.state as any)
  if (module.type === 'Parameter') return new ParameterNode(module.id, audioContext, module.state as any)
  if (module.type === 'Vca') return new VcaNode(module.id, audioContext, module.state as any)
  if (module.type === 'Scope') return new ScopeNode(module.id, audioContext, module.state as any)
  if (module.type === 'Lfo') return new LfoNode(module.id, audioContext, module.state as any)
  if (module.type === 'Euclidean') return new EuclideanNode(module.id, audioContext, module.state as any)
  throw new Error('not implemented: createAudioModule for type ' + module.type)
}

// TODO: does the state need to be structured clone?
export const createAudioModuleInitialState = (type: string): Record<string, any> | null => {
  if (type === 'Clock') return ClockNode.initialState
  if (type === 'Oscillator') return OscillatorNode.initialState
  if (type === 'Noise') return NoiseNode.initialState
  if (type === 'Filter') return FilterNode.initialState
  if (type === 'Envelope') return EnvelopeNode.initialState
  if (type === 'Delay') return DelayNode.initialState
  if (type === 'Reverb') return ReverbNode.initialState
  if (type === 'Quantiser') return QuantiserNode.initialState
  if (type === 'Parameter') return ParameterNode.initialState
  if (type === 'Vca') return VcaNode.initialState
  if (type === 'Scope') return ScopeNode.initialState
  if (type === 'Lfo') return LfoNode.initialState
  if (type === 'Euclidean') return EuclideanNode.initialState
  return null
}
