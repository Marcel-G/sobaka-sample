/**
 * Module Plugin Registry
 * 
 * This file pairs DSP module definitions with their Svelte UI components.
 * The app controls which modules are available by registering them here.
 */

import { PluginRegistry, definePlugin } from '@sobaka/dsp'

// Import DSP node classes with their state types
import {
  ClockNode,
  OscillatorNode,
  NoiseNode,
  FilterNode,
  EnvelopeNode,
  DelayNode,
  ReverbNode,
  QuantiserNode,
  ParameterNode,
  VcaNode,
  ScopeNode,
  LfoNode,
  EuclideanNode,
  type ClockState,
  type OscillatorState,
  type NoiseState,
  type FilterState,
  type EnvelopeState,
  type DelayState,
  type ReverbState,
  type QuantiserState,
  type ParameterState,
  type VcaState,
  type ScopeState,
  type LfoState,
  type EuclideanState,
} from '@sobaka/dsp'

// Import UI components
import {
  Clock,
  Oscillator,
  Noise,
  Filter,
  Envelope,
  Delay,
  Reverb,
  Quantiser,
  Parameter,
  Vca,
  Scope,
  Lfo,
  Euclidean,
} from '@sobaka/ui/modules'

// ============================================================================
// Plugin Definitions
// ============================================================================

// Sources - generate audio/control signals
export const ClockPlugin = definePlugin({
  type: 'Clock' as const,
  name: 'Clock',
  category: 'sources',
  initialState: ClockNode.initialState,
  createNode: (id, ctx, state) => new ClockNode(id, ctx, state),
  component: Clock,
})

export const OscillatorPlugin = definePlugin({
  type: 'Oscillator' as const,
  name: 'Oscillator',
  category: 'sources',
  initialState: OscillatorNode.initialState,
  createNode: (id, ctx, state) => new OscillatorNode(id, ctx, state),
  component: Oscillator,
})

export const NoisePlugin = definePlugin({
  type: 'Noise' as const,
  name: 'Noise',
  category: 'sources',
  initialState: NoiseNode.initialState,
  createNode: (id, ctx, state) => new NoiseNode(id, ctx, state),
  component: Noise,
})

export const LfoPlugin = definePlugin({
  type: 'Lfo' as const,
  name: 'LFO',
  category: 'sources',
  initialState: LfoNode.initialState,
  createNode: (id, ctx, state) => new LfoNode(id, ctx, state),
  component: Lfo,
})

// Modifiers - shape audio signals
export const FilterPlugin = definePlugin({
  type: 'Filter' as const,
  name: 'Filter',
  category: 'modifiers',
  initialState: FilterNode.initialState,
  createNode: (id, ctx, state) => new FilterNode(id, ctx, state),
  component: Filter,
})

export const VcaPlugin = definePlugin({
  type: 'Vca' as const,
  name: 'VCA',
  category: 'modifiers',
  initialState: VcaNode.initialState,
  createNode: (id, ctx, state) => new VcaNode(id, ctx, state),
  component: Vca,
})

export const EnvelopePlugin = definePlugin({
  type: 'Envelope' as const,
  name: 'Envelope',
  category: 'modifiers',
  initialState: EnvelopeNode.initialState,
  createNode: (id, ctx, state) => new EnvelopeNode(id, ctx, state),
  component: Envelope,
})

export const QuantiserPlugin = definePlugin({
  type: 'Quantiser' as const,
  name: 'Quantiser',
  category: 'modifiers',
  initialState: QuantiserNode.initialState,
  createNode: (id, ctx, state) => new QuantiserNode(id, ctx, state),
  component: Quantiser,
})

// Effects - process audio
export const DelayPlugin = definePlugin({
  type: 'Delay' as const,
  name: 'Delay',
  category: 'effects',
  initialState: DelayNode.initialState,
  createNode: (id, ctx, state) => new DelayNode(id, ctx, state),
  component: Delay,
})

export const ReverbPlugin = definePlugin({
  type: 'Reverb' as const,
  name: 'Reverb',
  category: 'effects',
  initialState: ReverbNode.initialState,
  createNode: (id, ctx, state) => new ReverbNode(id, ctx, state),
  component: Reverb,
})

// Logic - control/sequencing
export const EuclideanPlugin = definePlugin({
  type: 'Euclidean' as const,
  name: 'Euclidean',
  category: 'logic',
  initialState: EuclideanNode.initialState,
  createNode: (id, ctx, state) => new EuclideanNode(id, ctx, state),
  component: Euclidean,
})

// Utilities
export const ParameterPlugin = definePlugin({
  type: 'Parameter' as const,
  name: 'Parameter',
  category: 'utilities',
  initialState: ParameterNode.initialState,
  createNode: (id, ctx, state) => new ParameterNode(id, ctx, state),
  component: Parameter,
})

export const ScopePlugin = definePlugin({
  type: 'Scope' as const,
  name: 'Scope',
  category: 'utilities',
  initialState: ScopeNode.initialState,
  createNode: (id, ctx, state) => new ScopeNode(id, ctx, state),
  component: Scope,
})

// ============================================================================
// All Plugins
// ============================================================================

export const allPlugins = [
  // Sources
  ClockPlugin,
  OscillatorPlugin,
  NoisePlugin,
  LfoPlugin,
  // Modifiers
  FilterPlugin,
  VcaPlugin,
  EnvelopePlugin,
  QuantiserPlugin,
  // Effects
  DelayPlugin,
  ReverbPlugin,
  // Logic
  EuclideanPlugin,
  // Utilities
  ParameterPlugin,
  ScopePlugin,
] as const

// ============================================================================
// Registry Instance
// ============================================================================

/**
 * The global plugin registry for this application.
 * All module plugins are registered here.
 */
export const pluginRegistry = new PluginRegistry().registerAll([...allPlugins])
