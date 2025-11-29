import type { DelayNode as _DelayNode } from '@sobaka/dsp/wasm'
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
  private delay: _DelayNode
  private delayTimeParam: AudioParam

  constructor(
    public readonly id: string,
    private audioContext: AudioContext,
    initialState: DelayState,
    delay: _DelayNode
  ) {
    this.delay = delay
    this.delayTimeParam = this.delay.node.parameters.get('delay')
    
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
        module: this.delay.node,
        connectIndex: 1
      },
      // Reset input
      [createPlugId(this.id, PlugType.Input, 1)]: {
        type: PlugType.Input,
        module: this.delay.node,
        connectIndex: 0
      },
      // Output
      [createPlugId(this.id, PlugType.Output, 0)]: {
        type: PlugType.Output,
        module: this.delay.node,
        connectIndex: 0
      }
    }
  }

  destroy(): void {
    this.delay?.free()
  }
}
