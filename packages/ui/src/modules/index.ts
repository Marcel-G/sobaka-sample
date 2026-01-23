/**
 * UI Modules Package
 * 
 * Exports component definitions and registry.
 * App is responsible for creating registry and registering components.
 */

// Types
export type { ModuleComponent, BaseModuleProps } from '../types/props'

// Registry system (deprecated - use PluginRegistry from @sobaka/dsp instead)
export { UIModuleRegistry, type UIModuleDefinition } from './registry'

// Component definitions (app registers these)
export * from './definitions'

// Legacy exports (deprecated - use registry instead)
import { type Module } from '@sobaka/state/models/workspace'
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
} from './definitions'

/** @deprecated Use UIModuleRegistry instead */
export const MODULES = {
  Clock,
  Delay,
  Envelope,
  Euclidean,
  Filter,
  Lfo,
  Noise,
  Oscillator,
  Parameter,
  Quantiser,
  Reverb,
  Scope,
  Vca,
} as const

/** @deprecated Use UIModuleRegistry.get() instead */
export const getComponent = (module: Module) => {
  return MODULES[module.type as keyof typeof MODULES]
}
