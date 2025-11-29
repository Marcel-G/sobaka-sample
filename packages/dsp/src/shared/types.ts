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
export const INVENTORY: Record<string, ModuleDSPFactory | undefined> = {}

/**
 * Register a DSP factory for a module type
 */
export function register(factory: ModuleDSPFactory, moduleType: string) {
  INVENTORY[moduleType] = factory
}
