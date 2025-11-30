import { QuantiserNode as _QuantiserNode} from '@sobaka/dsp/wasm'
import { ModuleDSP, ModuleRouting } from '../../shared/types'

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

  get node(): AudioNode {
    return this.quantiser.node
  }

  updateState(state: Record<string, unknown>): void {
    const quantiserState = state as QuantiserState
    
    const notes = quantiserState.notes.map(({ value }) => value)
    this.quantiser.updateNotes(notes)
  }

  getRoute(): ModuleRouting {
    return {
      inputs: [
        { index: 0, label: 'Signal', node: this.quantiser.node, connectIndex: 0 }
      ],
      outputs: [
        { index: 0, label: 'Quantised', node: this.quantiser.node, connectIndex: 0 }
      ]
    }
  }

  destroy(): void {
    this.quantiser?.free()
  }
}
