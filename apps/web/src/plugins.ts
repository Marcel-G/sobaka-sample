import type { ModuleDSP, ModuleFactory } from '@sobaka/dsp'
import type { ModuleComponent } from '@sobaka/ui/types'
import { createLogger } from '@sobaka/state'

const logger = createLogger('PluginRegistry')

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
  EuclideanNode
} from '@sobaka/dsp'

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
  Euclidean
} from '@sobaka/ui/modules'

// ============================================================================
// Plugin Types
// ============================================================================

export type ModuleCategory = 'sources' | 'modifiers' | 'effects' | 'logic' | 'utilities'

export interface ModulePlugin<
  TType extends string = string,
  TState = Record<string, unknown>,
  TNode extends ModuleDSP = ModuleDSP
> {
  /** Literal type identifier e.g. 'Oscillator' */
  readonly type: TType

  /** Display name for UI */
  readonly name: string

  /** Category for module palette grouping */
  readonly category: ModuleCategory

  /** Initial state for new instances */
  readonly initialState: TState

  /** Factory to create DSP node */
  readonly createNode: (id: string, ctx: AudioContext, state: TState) => TNode

  /** Svelte component that renders this module */
  readonly component: ModuleComponent<TNode>
}

export function definePlugin<TType extends string, TState, TNode extends ModuleDSP>(
  plugin: ModulePlugin<TType, TState, TNode>
): ModulePlugin<TType, TState, TNode> {
  return plugin
}

// ============================================================================
// Plugin Registry
// ============================================================================

export class PluginRegistry implements ModuleFactory {
  private plugins = new Map<string, ModulePlugin>()

  /**
   * Register a module plugin
   */
  register<T extends string, S, N extends ModuleDSP>(
    plugin: ModulePlugin<T, S, N>
  ): this {
    if (this.plugins.has(plugin.type)) {
      logger.warn(`Plugin "${plugin.type}" already registered, overwriting`)
    }
    this.plugins.set(plugin.type, plugin as unknown as ModulePlugin)
    return this
  }

  /**
   * Register multiple plugins at once
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registerAll(plugins: readonly ModulePlugin<string, any, any>[]): this {
    for (const plugin of plugins) {
      this.register(plugin)
    }
    return this
  }

  /**
   * Get a plugin by type
   */
  get(type: string): ModulePlugin | undefined {
    return this.plugins.get(type)
  }

  /**
   * Check if a plugin is registered
   */
  has(type: string): boolean {
    return this.plugins.has(type)
  }

  /**
   * Create a DSP node for a module type (implements ModuleFactory)
   */
  createNode(
    type: string,
    id: string,
    ctx: AudioContext,
    state: Record<string, unknown>
  ): ModuleDSP {
    const plugin = this.plugins.get(type)
    if (!plugin) {
      throw new Error(
        `Unknown module type: ${type}. Did you forget to register the plugin?`
      )
    }
    return plugin.createNode(id, ctx, state)
  }

  /**
   * Get the Svelte component for a module type
   */
  getComponent(type: string): ModuleComponent<ModuleDSP> | undefined {
    return this.plugins.get(type)?.component
  }

  /**
   * Get initial state for a module type (implements ModuleFactory)
   */
  getInitialState(type: string): Record<string, unknown> | null {
    return this.plugins.get(type)?.initialState ?? null
  }

  /**
   * Get all registered plugins
   */
  getAll(): ModulePlugin[] {
    return Array.from(this.plugins.values())
  }

  /**
   * Get all registered type identifiers
   */
  getTypes(): string[] {
    return Array.from(this.plugins.keys())
  }

  /**
   * Get plugins filtered by category
   */
  getByCategory(category: ModuleCategory): ModulePlugin[] {
    return this.getAll().filter(p => p.category === category)
  }
}

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
  component: Clock
})

export const OscillatorPlugin = definePlugin({
  type: 'Oscillator' as const,
  name: 'Oscillator',
  category: 'sources',
  initialState: OscillatorNode.initialState,
  createNode: (id, ctx, state) => new OscillatorNode(id, ctx, state),
  component: Oscillator
})

export const NoisePlugin = definePlugin({
  type: 'Noise' as const,
  name: 'Noise',
  category: 'sources',
  initialState: NoiseNode.initialState,
  createNode: (id, ctx, state) => new NoiseNode(id, ctx, state),
  component: Noise
})

export const LfoPlugin = definePlugin({
  type: 'Lfo' as const,
  name: 'LFO',
  category: 'sources',
  initialState: LfoNode.initialState,
  createNode: (id, ctx, state) => new LfoNode(id, ctx, state),
  component: Lfo
})

// Modifiers - shape audio signals
export const FilterPlugin = definePlugin({
  type: 'Filter' as const,
  name: 'Filter',
  category: 'modifiers',
  initialState: FilterNode.initialState,
  createNode: (id, ctx, state) => new FilterNode(id, ctx, state),
  component: Filter
})

export const VcaPlugin = definePlugin({
  type: 'Vca' as const,
  name: 'VCA',
  category: 'modifiers',
  initialState: VcaNode.initialState,
  createNode: (id, ctx, state) => new VcaNode(id, ctx, state),
  component: Vca
})

export const EnvelopePlugin = definePlugin({
  type: 'Envelope' as const,
  name: 'Envelope',
  category: 'modifiers',
  initialState: EnvelopeNode.initialState,
  createNode: (id, ctx, state) => new EnvelopeNode(id, ctx, state),
  component: Envelope
})

export const QuantiserPlugin = definePlugin({
  type: 'Quantiser' as const,
  name: 'Quantiser',
  category: 'modifiers',
  initialState: QuantiserNode.initialState,
  createNode: (id, ctx, state) => new QuantiserNode(id, ctx, state),
  component: Quantiser
})

// Effects - process audio
export const DelayPlugin = definePlugin({
  type: 'Delay' as const,
  name: 'Delay',
  category: 'effects',
  initialState: DelayNode.initialState,
  createNode: (id, ctx, state) => new DelayNode(id, ctx, state),
  component: Delay
})

export const ReverbPlugin = definePlugin({
  type: 'Reverb' as const,
  name: 'Reverb',
  category: 'effects',
  initialState: ReverbNode.initialState,
  createNode: (id, ctx, state) => new ReverbNode(id, ctx, state),
  component: Reverb
})

// Logic - control/sequencing
export const EuclideanPlugin = definePlugin({
  type: 'Euclidean' as const,
  name: 'Euclidean',
  category: 'logic',
  initialState: EuclideanNode.initialState,
  createNode: (id, ctx, state) => new EuclideanNode(id, ctx, state),
  component: Euclidean
})

// Utilities
export const ParameterPlugin = definePlugin({
  type: 'Parameter' as const,
  name: 'Parameter',
  category: 'utilities',
  initialState: ParameterNode.initialState,
  createNode: (id, ctx, state) => new ParameterNode(id, ctx, state),
  component: Parameter
})

export const ScopePlugin = definePlugin({
  type: 'Scope' as const,
  name: 'Scope',
  category: 'utilities',
  initialState: ScopeNode.initialState,
  createNode: (id, ctx, state) => new ScopeNode(id, ctx, state),
  component: Scope
})

export const allPlugins = [
  ClockPlugin,
  OscillatorPlugin,
  NoisePlugin,
  LfoPlugin,
  FilterPlugin,
  VcaPlugin,
  EnvelopePlugin,
  QuantiserPlugin,
  DelayPlugin,
  ReverbPlugin,
  EuclideanPlugin,
  ParameterPlugin,
  ScopePlugin
]

/**
 * The global plugin registry for this application.
 * All module plugins are registered here.
 */
export const pluginRegistry = new PluginRegistry().registerAll(allPlugins)
