import type { SvelteComponent } from 'svelte'
import type { ModuleUI } from '@sobaka/state/models/workspace'

/**
 * Module Registry
 * 
 * This registry allows applications to register Svelte components for different module types.
 * The @sobaka/ui package doesn't assume which modules are available - the application
 * registers them explicitly.
 */

type ModuleComponent = typeof SvelteComponent<any>

interface ModuleRegistry {
  components: Map<ModuleUI, ModuleComponent>
  initialStates: Map<ModuleUI, any>
}

const registry: ModuleRegistry = {
  components: new Map(),
  initialStates: new Map()
}

/**
 * Register a module component with its initial state
 */
export function registerModule(
  type: ModuleUI,
  component: ModuleComponent,
  initialState: any
): void {
  registry.components.set(type, component)
  registry.initialStates.set(type, initialState)
}

/**
 * Register multiple modules at once
 */
export function registerModules(
  modules: Array<{
    type: ModuleUI
    component: ModuleComponent
    initialState: any
  }>
): void {
  modules.forEach(({ type, component, initialState }) => {
    registerModule(type, component, initialState)
  })
}

/**
 * Get a registered component by module type
 */
export function getModuleComponent(type: ModuleUI): ModuleComponent | undefined {
  return registry.components.get(type)
}

/**
 * Get all registered module types
 */
export function getRegisteredModuleTypes(): ModuleUI[] {
  return Array.from(registry.components.keys())
}

/**
 * Get initial state for a module type
 */
export function getModuleInitialState(type: ModuleUI): any {
  return registry.initialStates.get(type)
}

/**
 * Check if a module type is registered
 */
export function isModuleRegistered(type: ModuleUI): boolean {
  return registry.components.has(type)
}

/**
 * Clear all registered modules (useful for testing)
 */
export function clearRegistry(): void {
  registry.components.clear()
  registry.initialStates.clear()
}
