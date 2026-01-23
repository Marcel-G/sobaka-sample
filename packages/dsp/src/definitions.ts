/**
 * Module definitions for all DSP modules
 * App imports these and registers the ones it needs
 */

import type { ModuleDefinition } from './registry'

// Import all node classes
import { ClockNode, type ClockState } from './module/clock/node'
import { OscillatorNode, type OscillatorState } from './module/oscillator/node'
import { NoiseNode, type NoiseState } from './module/noise/node'
import { FilterNode, type FilterState } from './module/filter/node'
import { EnvelopeNode, type EnvelopeState } from './module/envelope/node'
import { DelayNode, type DelayState } from './module/delay/node'
import { ReverbNode, type ReverbState } from './module/reverb/node'
import { QuantiserNode, type QuantiserState } from './module/quantiser/node'
import { ParameterNode, type ParameterState } from './module/parameter/node'
import { VcaNode, type VcaState } from './module/vca/node'
import { ScopeNode, type ScopeState } from './module/scope/node'
import { LfoNode, type LfoState } from './module/lfo/node'
import { EuclideanNode, type EuclideanState } from './module/euclidean/node'

// Sources - generate audio/control signals
export const ClockDefinition: ModuleDefinition<ClockState> = {
  type: 'Clock',
  name: 'Clock',
  category: 'sources',
  initialState: ClockNode.initialState,
  createNode: (id, ctx, state) => new ClockNode(id, ctx, state),
}

export const OscillatorDefinition: ModuleDefinition<OscillatorState> = {
  type: 'Oscillator',
  name: 'Oscillator',
  category: 'sources',
  initialState: OscillatorNode.initialState,
  createNode: (id, ctx, state) => new OscillatorNode(id, ctx, state),
}

export const NoiseDefinition: ModuleDefinition<NoiseState> = {
  type: 'Noise',
  name: 'Noise',
  category: 'sources',
  initialState: NoiseNode.initialState,
  createNode: (id, ctx, state) => new NoiseNode(id, ctx, state),
}

export const LfoDefinition: ModuleDefinition<LfoState> = {
  type: 'Lfo',
  name: 'LFO',
  category: 'sources',
  initialState: LfoNode.initialState,
  createNode: (id, ctx, state) => new LfoNode(id, ctx, state),
}

// Modifiers - shape audio signals
export const FilterDefinition: ModuleDefinition<FilterState> = {
  type: 'Filter',
  name: 'Filter',
  category: 'modifiers',
  initialState: FilterNode.initialState,
  createNode: (id, ctx, state) => new FilterNode(id, ctx, state),
}

export const VcaDefinition: ModuleDefinition<VcaState> = {
  type: 'Vca',
  name: 'VCA',
  category: 'modifiers',
  initialState: VcaNode.initialState,
  createNode: (id, ctx, state) => new VcaNode(id, ctx, state),
}

export const EnvelopeDefinition: ModuleDefinition<EnvelopeState> = {
  type: 'Envelope',
  name: 'Envelope',
  category: 'modifiers',
  initialState: EnvelopeNode.initialState,
  createNode: (id, ctx, state) => new EnvelopeNode(id, ctx, state),
}

export const QuantiserDefinition: ModuleDefinition<QuantiserState> = {
  type: 'Quantiser',
  name: 'Quantiser',
  category: 'modifiers',
  initialState: QuantiserNode.initialState,
  createNode: (id, ctx, state) => new QuantiserNode(id, ctx, state),
}

// Effects - process audio
export const DelayDefinition: ModuleDefinition<DelayState> = {
  type: 'Delay',
  name: 'Delay',
  category: 'effects',
  initialState: DelayNode.initialState,
  createNode: (id, ctx, state) => new DelayNode(id, ctx, state),
}

export const ReverbDefinition: ModuleDefinition<ReverbState> = {
  type: 'Reverb',
  name: 'Reverb',
  category: 'effects',
  initialState: ReverbNode.initialState,
  createNode: (id, ctx, state) => new ReverbNode(id, ctx, state),
}

// Logic - control/sequencing
export const EuclideanDefinition: ModuleDefinition<EuclideanState> = {
  type: 'Euclidean',
  name: 'Euclidean',
  category: 'logic',
  initialState: EuclideanNode.initialState,
  createNode: (id, ctx, state) => new EuclideanNode(id, ctx, state),
}

// Utilities
export const ParameterDefinition: ModuleDefinition<ParameterState> = {
  type: 'Parameter',
  name: 'Parameter',
  category: 'utilities',
  initialState: ParameterNode.initialState,
  createNode: (id, ctx, state) => new ParameterNode(id, ctx, state),
}

export const ScopeDefinition: ModuleDefinition<ScopeState> = {
  type: 'Scope',
  name: 'Scope',
  category: 'utilities',
  initialState: ScopeNode.initialState,
  createNode: (id, ctx, state) => new ScopeNode(id, ctx, state),
}

/**
 * All available module definitions
 * App can register all or pick specific ones
 */
export const allModuleDefinitions: ModuleDefinition<any>[] = [
  // Sources
  ClockDefinition,
  OscillatorDefinition,
  NoiseDefinition,
  LfoDefinition,
  // Modifiers
  FilterDefinition,
  VcaDefinition,
  EnvelopeDefinition,
  QuantiserDefinition,
  // Effects
  DelayDefinition,
  ReverbDefinition,
  // Logic
  EuclideanDefinition,
  // Utilities
  ParameterDefinition,
  ScopeDefinition,
]
