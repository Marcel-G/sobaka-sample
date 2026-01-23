import { ModuleDSP } from './shared/types'

/**
 * Module categories for UI grouping
 */
export type ModuleCategory = 'sources' | 'modifiers' | 'effects' | 'logic' | 'utilities'

/**
 * Definition for a DSP module type
 * Packages export these, app registers them
 */
export interface ModuleDefinition<TState = Record<string, any>> {
  /** Unique module type identifier (e.g., 'Clock', 'Oscillator') */
  type: string
  
  /** Display name for UI */
  name: string
  
  /** Category for grouping in module palette */
  category: ModuleCategory
  
  /** Initial state for new module instances */
  initialState: TState
  
  /** Factory to create DSP node instance */
  createNode: (id: string, audioContext: AudioContext, state: TState) => ModuleDSP
}

/**
 * Registry for DSP module definitions
 * App creates instance and registers modules it needs
 */
export class ModuleRegistry {
  private modules = new Map<string, ModuleDefinition>()

  /**
   * Register a module definition
   */
  register<TState>(definition: ModuleDefinition<TState>): this {
    if (this.modules.has(definition.type)) {
      console.warn(`Module type "${definition.type}" already registered, overwriting`)
    }
    this.modules.set(definition.type, definition as ModuleDefinition)
    return this
  }

  /**
   * Register multiple module definitions
   */
  registerAll(definitions: ModuleDefinition[]): this {
    for (const def of definitions) {
      this.register(def)
    }
    return this
  }

  /**
   * Get a module definition by type
   */
  get(type: string): ModuleDefinition | undefined {
    return this.modules.get(type)
  }

  /**
   * Check if a module type is registered
   */
  has(type: string): boolean {
    return this.modules.has(type)
  }

  /**
   * Get all registered module definitions
   */
  getAll(): ModuleDefinition[] {
    return Array.from(this.modules.values())
  }

  /**
   * Get all module types
   */
  getTypes(): string[] {
    return Array.from(this.modules.keys())
  }

  /**
   * Get modules filtered by category
   */
  getByCategory(category: ModuleCategory): ModuleDefinition[] {
    return this.getAll().filter(m => m.category === category)
  }

  /**
   * Create a DSP node for a module
   */
  createNode(type: string, id: string, audioContext: AudioContext, state: Record<string, any>): ModuleDSP {
    const definition = this.modules.get(type)
    if (!definition) {
      throw new Error(`Unknown module type: ${type}. Did you forget to register it?`)
    }
    return definition.createNode(id, audioContext, state)
  }

  /**
   * Get initial state for a module type
   */
  getInitialState(type: string): Record<string, any> | null {
    const definition = this.modules.get(type)
    return definition?.initialState ?? null
  }
}
