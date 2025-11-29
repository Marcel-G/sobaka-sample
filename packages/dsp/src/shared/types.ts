import type { PlugType } from '../models/links'
// These types will come from @sobaka/state once it's properly exported
type NodeContext = any
type ParamContext = any

/**
 * Base interface for all module DSP instances
 * Each module type (Clock, Oscillator, etc.) implements this interface
 */
export interface ModuleDSP {
  /** Unique identifier matching the module in state */
  readonly id: string
  
  /** Update the DSP node parameters based on state changes */
  updateState(state: Record<string, unknown>): void
  
  /** Get plug contexts for audio routing */
  getPlugContexts(): Record<string, ParamContext | NodeContext>
  
  /** Clean up audio nodes and resources */
  destroy(): void
}

/**
 * Factory function type for creating module DSP instances
 */
export type ModuleDSPFactory = (
  id: string,
  audioContext: AudioContext,
  initialState: Record<string, unknown>
) => Promise<ModuleDSP>

/**
 * Registry of DSP factories by module type
 */
export const DSP_FACTORIES: Record<string, ModuleDSPFactory | undefined> = {}

/**
 * Register a DSP factory for a module type
 */
export function registerDSPFactory(moduleType: string, factory: ModuleDSPFactory) {
  DSP_FACTORIES[moduleType] = factory
}
