import { createPlugId, PlugType } from '@sobaka/state'

import { QuantiserNode as _QuantiserNode} from '@sobaka/dsp/wasm'
import { ModuleDSP } from '../../shared/types'
import { NodeContext, ParamContext } from '@sobaka/state/models/plugs'

interface QuantiserState {
  notes: { value: boolean }[]
}

/**
 * DSP implementation for Quantiser module
 * Manages Quantiser WASM node
 */
export class QuantiserDSP implements ModuleDSP {
  private quantiser: _QuantiserNode

  constructor(
    public readonly id: string,
    private audioContext: AudioContext,
    initialState: QuantiserState,
    quantiser: _QuantiserNode
  ) {
    this.quantiser = quantiser
    
    // Set initial state
    this.updateState(initialState)
  }

  updateState(state: Record<string, unknown>): void {
    const quantiserState = state as QuantiserState
    
    const notes = quantiserState.notes.map(({ value }) => value)
    this.quantiser.update_notes(notes)
  }

  getPlugContexts(): Record<string, ParamContext | NodeContext> {
    return {
      // Signal input
      [createPlugId(this.id, PlugType.Input, 0)]: {
        type: PlugType.Input,
        module: this.quantiser.node,
        connectIndex: 0
      },
      // Output
      [createPlugId(this.id, PlugType.Output, 0)]: {
        type: PlugType.Output,
        module: this.quantiser.node,
        connectIndex: 0
      }
    }
  }

  destroy(): void {
    this.quantiser?.free()
  }
}

