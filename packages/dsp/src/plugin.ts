import type { Component } from 'svelte'
import type { ModuleDSP } from './shared/types'

/**
 * Module categories for UI grouping
 */
export type ModuleCategory = 'sources' | 'modifiers' | 'effects' | 'logic' | 'utilities'

/**
 * Base props that all module components must accept
 * This is duplicated from @sobaka/ui to avoid circular dependency
 */
export interface BaseModuleProps {
  disabled?: boolean
  position: import('svelte/store').Readable<{ x: number; y: number }>
  onClose?: (() => void) | null
  onClone?: (() => void) | null
  onDrag?: ((x: number, y: number) => void) | null
  bindElement?: ((element: HTMLElement) => (() => void) | void) | null
  onPlugClick?: ((routeName: string) => void) | null
  bindPlugElement?: ((routeName: string, element: HTMLElement) => (() => void) | void) | null
}

/**
 * Type constraint for module Svelte components
 * Ensures the component accepts a `node` prop of the correct DSP type
 */
export type ModuleComponent<TNode extends ModuleDSP> = Component<
  BaseModuleProps & { node: TNode }
>

/**
 * A ModulePlugin bundles together:
 * - The module type identifier (literal type, not just string)
 * - DSP module factory + state type
 * - Svelte component with matching props
 * 
 * This ensures compile-time type safety between DSP nodes and their UI components.
 */
export interface ModulePlugin<
  TType extends string = string,
  TState extends Record<string, unknown> = Record<string, unknown>,
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

/**
 * Helper to create a type-safe plugin definition
 * This function exists purely for type inference
 */
export function definePlugin<
  TType extends string,
  TState extends Record<string, unknown>,
  TNode extends ModuleDSP
>(plugin: ModulePlugin<TType, TState, TNode>): ModulePlugin<TType, TState, TNode> {
  return plugin
}

/**
 * Registry for module plugins
 * Provides unified access to DSP factories and UI components
 */
export class PluginRegistry {
  private plugins = new Map<string, ModulePlugin>()

  /**
   * Register a module plugin
   */
  register<T extends string, S extends Record<string, unknown>, N extends ModuleDSP>(
    plugin: ModulePlugin<T, S, N>
  ): this {
    if (this.plugins.has(plugin.type)) {
      console.warn(`Plugin "${plugin.type}" already registered, overwriting`)
    }
    // Cast is safe because we're storing in a heterogeneous map
    this.plugins.set(plugin.type, plugin as unknown as ModulePlugin)
    return this
  }

  /**
   * Register multiple plugins at once
   */
  registerAll(plugins: ModulePlugin[]): this {
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
   * Create a DSP node for a module type
   */
  createNode(type: string, id: string, ctx: AudioContext, state: Record<string, unknown>): ModuleDSP {
    const plugin = this.plugins.get(type)
    if (!plugin) {
      throw new Error(`Unknown module type: ${type}. Did you forget to register the plugin?`)
    }
    return plugin.createNode(id, ctx, state as any)
  }

  /**
   * Get the Svelte component for a module type
   */
  getComponent(type: string): Component<any> | undefined {
    return this.plugins.get(type)?.component
  }

  /**
   * Get initial state for a module type
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
