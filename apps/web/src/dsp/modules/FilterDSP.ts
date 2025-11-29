import type { Filter } from 'sobaka-dsp'
import type { ModuleDSP, ModuleDSPFactory } from '../types'
import { registerDSPFactory } from '../types'
import { createPlugId, PlugType } from '../../models/links'
import type { NodeContext, ParamContext } from '../../context/plugs'

interface FilterState {
  frequency: number
  q: number
}

/**
 * DSP implementation for Filter module
 * Manages Filter WASM node and its parameters
 */
export class FilterDSP implements ModuleDSP {
  private filter: Filter
  private node: AudioNode
  private frequencyParam: AudioParam
  private qParam: AudioParam

  constructor(
    public readonly id: string,
    private audioContext: AudioContext,
    initialState: FilterState,
    filter: Filter
  ) {
    this.filter = filter
    this.node = filter.node()
    this.frequencyParam = filter.get_param('Frequency')
    this.qParam = filter.get_param('Q')
    
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
        module: this.node,
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
        module: this.node,
        connectIndex: 0
      },
      // Highpass output
      [createPlugId(this.id, PlugType.Output, 1)]: {
        type: PlugType.Output,
        module: this.node,
        connectIndex: 1
      },
      // Bandpass output
      [createPlugId(this.id, PlugType.Output, 2)]: {
        type: PlugType.Output,
        module: this.node,
        connectIndex: 2
      },
      // Moog output
      [createPlugId(this.id, PlugType.Output, 3)]: {
        type: PlugType.Output,
        module: this.node,
        connectIndex: 3
      }
    }
  }

  destroy(): void {
    this.filter?.destroy()
    this.filter?.free()
  }
}

/**
 * Factory function for creating Filter DSP instances
 */
const createFilterDSP: ModuleDSPFactory = async (id, audioContext, initialState) => {
  const { Filter } = await import('sobaka-dsp')
  const filter = await Filter.create(audioContext)
  
  return new FilterDSP(id, audioContext, initialState as FilterState, filter)
}

// Register the factory
registerDSPFactory('Filter', createFilterDSP)

export default createFilterDSP
