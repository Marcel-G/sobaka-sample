import { FilterNode as _FilterNode} from '@sobaka/dsp/wasm'
import { ModuleDSP, ModuleRouting } from '../../shared/types'

interface FilterState {
  frequency: number
  q: number
}

/**
 * DSP implementation for Filter module
 * Manages Filter WASM node and its parameters
 */
export class FilterDSP implements ModuleDSP {
  private filter: _FilterNode
  private frequencyParam: AudioParam
  private qParam: AudioParam

  constructor(
    public readonly id: string,
    private audioContext: AudioContext,
    initialState: FilterState,
    filter: _FilterNode
  ) {
    this.filter = filter
    this.frequencyParam = filter.node.parameters.get('frequency')
    this.qParam = filter.node.parameters.get('q')
    
    // Set initial state
    this.updateState(initialState)
  }

  get node(): AudioNode {
    return this.filter.node
  }

  updateState(state: Record<string, unknown>): void {
    const filterState = state as FilterState
    
    this.frequencyParam.setValueAtTime(
      filterState.frequency,
      this.audioContext.currentTime
    )
    this.qParam.setValueAtTime(filterState.q, this.audioContext.currentTime)
  }

  getRouting(): ModuleRouting {
    return {
      inputs: [
        { index: 0, label: 'Signal', node: this.filter.node, connectIndex: 0 }
      ],
      params: [
        { index: 1, label: 'Cutoff CV', param: this.frequencyParam },
        { index: 2, label: 'Q CV', param: this.qParam }
      ],
      outputs: [
        { index: 0, label: 'Lowpass', node: this.filter.node, connectIndex: 0 },
        { index: 1, label: 'Highpass', node: this.filter.node, connectIndex: 1 },
        { index: 2, label: 'Bandpass', node: this.filter.node, connectIndex: 2 },
        { index: 3, label: 'Moog', node: this.filter.node, connectIndex: 3 }
      ]
    }
  }

  destroy(): void {
    this.filter?.free()
  }
}
