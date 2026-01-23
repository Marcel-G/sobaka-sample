import type { Component } from 'svelte'

/**
 * Definition for a UI module component
 */
export interface UIModuleDefinition {
  /** Module type (must match DSP module type) */
  type: string
  /** Svelte component for rendering the module */
  component: Component<any>
}

/**
 * Registry for UI module components
 * App creates instance and registers components it needs
 */
export class UIModuleRegistry {
  private components = new Map<string, Component<any>>()

  /**
   * Register a UI component for a module type
   */
  register(type: string, component: Component<any>): this {
    if (this.components.has(type)) {
      console.warn(`UI component for "${type}" already registered, overwriting`)
    }
    this.components.set(type, component)
    return this
  }

  /**
   * Register multiple UI components
   */
  registerAll(definitions: UIModuleDefinition[]): this {
    for (const def of definitions) {
      this.register(def.type, def.component)
    }
    return this
  }

  /**
   * Get component for a module type
   */
  get(type: string): Component<any> | undefined {
    return this.components.get(type)
  }

  /**
   * Check if a component is registered for a type
   */
  has(type: string): boolean {
    return this.components.has(type)
  }

  /**
   * Get all registered types
   */
  getTypes(): string[] {
    return Array.from(this.components.keys())
  }
}
