import type { Quantiser } from 'sobaka-dsp'
import type { ModuleDSP, ModuleDSPFactory } from '../types'
import { registerDSPFactory } from '../types'
import { createPlugId, PlugType } from '@sobaka/state/models/links'
import type { NodeContext, ParamContext } from '@sobaka/state/models/plugs'
import type { Tuple } from '@sobaka/ui/@types'

interface QuantiserState {
  notes: { value: boolean }[]
}

/**
 * DSP implementation for Quantiser module
 * Manages Quantiser WASM node
 */
export class QuantiserDSP implements ModuleDSP {
  private quantiser: Quantiser
  private node: AudioNode

  constructor(
    public readonly id: string,
    private audioContext: AudioContext,
    initialState: QuantiserState,
    quantiser: Quantiser
  ) {
    this.quantiser = quantiser
    this.node = quantiser.node()
    
    // Set initial state
    this.updateState(initialState)
  }

  updateState(state: Record<string, unknown>): void {
    const quantiserState = state as QuantiserState
    
    const notes = quantiserState.notes.map(({ value }) => value) as Tuple<boolean, 12>
    this.quantiser.command({ UpdateNotes: notes })
  }

  getPlugContexts(): Record<string, ParamContext | NodeContext> {
    return {
      // Signal input
      [createPlugId(this.id, PlugType.Input, 0)]: {
        type: PlugType.Input,
        module: this.node,
        connectIndex: 0
      },
      // Output
      [createPlugId(this.id, PlugType.Output, 0)]: {
        type: PlugType.Output,
        module: this.node,
        connectIndex: 0
      }
    }
  }

  destroy(): void {
    this.quantiser?.destroy()
    this.quantiser?.free()
  }
}

/**
 * Factory function for creating Quantiser DSP instances
 */
const createQuantiserDSP: ModuleDSPFactory = async (id, audioContext, initialState) => {
  const { Quantiser } = await import('sobaka-dsp')
  const quantiser = await Quantiser.create(audioContext)
  
  return new QuantiserDSP(id, audioContext, initialState as QuantiserState, quantiser)
}

// Register the factory
registerDSPFactory('Quantiser', createQuantiserDSP)

export default createQuantiserDSP
