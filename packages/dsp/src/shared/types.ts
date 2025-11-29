import { NodeContext, ParamContext } from "@sobaka/state/models/plugs"

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

