import type { Delay } from 'sobaka-dsp'
import type { ModuleDSP, ModuleDSPFactory } from '../types'
import { registerDSPFactory } from '../types'
import { createPlugId, PlugType } from '@sobaka/state/models/links'
import type { NodeContext, ParamContext } from '@sobaka/state/models/plugs'

interface DelayState {
  time: number
}

/**
 * DSP implementation for Delay module
 * Manages Delay WASM node and its parameters
 */
export class DelayDSP implements ModuleDSP {
  private delay: Delay
  private node: AudioNode
  private delayTimeParam: AudioParam

  constructor(
    public readonly id: string,
    private audioContext: AudioContext,
    initialState: DelayState,
    delay: Delay
  ) {
    this.delay = delay
    this.node = delay.node()
    this.delayTimeParam = delay.get_param('DelayTime')
    
    // Set initial state
    this.updateState(initialState)
  }

  updateState(state: Record<string, unknown>): void {
    const delayState = state as DelayState
    this.delayTimeParam.setValueAtTime(delayState.time, this.audioContext.currentTime)
  }

  getPlugContexts(): Record<string, ParamContext | NodeContext> {
    return {
      // Delay time CV input
      [createPlugId(this.id, PlugType.Param, 0)]: {
        type: PlugType.Param,
        param: this.delayTimeParam
      },
      // Signal input
      [createPlugId(this.id, PlugType.Input, 0)]: {
        type: PlugType.Input,
        module: this.node,
        connectIndex: 1
      },
      // Reset input
      [createPlugId(this.id, PlugType.Input, 1)]: {
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
    this.delay?.destroy()
    this.delay?.free()
  }
}

/**
 * Factory function for creating Delay DSP instances
 */
const createDelayDSP: ModuleDSPFactory = async (id, audioContext, initialState) => {
  const { Delay } = await import('sobaka-dsp')
  const delay = await Delay.create(audioContext)
  
  return new DelayDSP(id, audioContext, initialState as DelayState, delay)
}

// Register the factory
registerDSPFactory('Delay', createDelayDSP)

export default createDelayDSP
