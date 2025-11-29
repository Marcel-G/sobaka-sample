import { createPlugId, PlugType } from '@sobaka/state'

import { FilterNode as _FilterNode} from '@sobaka/dsp/wasm'
import { ModuleDSP } from '../../shared/types'
import { NodeContext, ParamContext } from '@sobaka/state/models/plugs'

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

  updateState(state: Record<string, unknown>): void {
    const filterState = state as FilterState
    
    this.frequencyParam.setValueAtTime(
      filterState.frequency,
      this.audioContext.currentTime
    )
    this.qParam.setValueAtTime(filterState.q, this.audioContext.currentTime)
  }

  getPlugContexts(): Record<string, ParamContext | NodeContext> {
    return {
      // Signal input
      [createPlugId(this.id, PlugType.Input, 0)]: {
        type: PlugType.Input,
        module: this.filter.node,
        connectIndex: 0
      },
      // Cutoff CV input
      [createPlugId(this.id, PlugType.Param, 1)]: {
        type: PlugType.Param,
        param: this.frequencyParam
      },
      // Q CV input
      [createPlugId(this.id, PlugType.Param, 2)]: {
        type: PlugType.Param,
        param: this.qParam
      },
      // Lowpass output
      [createPlugId(this.id, PlugType.Output, 0)]: {
        type: PlugType.Output,
        module: this.filter.node,
        connectIndex: 0
      },
      // Highpass output
      [createPlugId(this.id, PlugType.Output, 1)]: {
        type: PlugType.Output,
        module: this.filter.node,
        connectIndex: 1
      },
      // Bandpass output
      [createPlugId(this.id, PlugType.Output, 2)]: {
        type: PlugType.Output,
        module: this.filter.node,
        connectIndex: 2
      },
      // Moog output
      [createPlugId(this.id, PlugType.Output, 3)]: {
        type: PlugType.Output,
        module: this.filter.node,
        connectIndex: 3
      }
    }
  }

  destroy(): void {
    this.filter?.free()
  }
}

