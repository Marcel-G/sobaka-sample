import type { DelayNode as _DelayNode } from '@sobaka/dsp/wasm'
import { ModuleDSP, ModuleRouting } from '../../shared/types'

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

  get node(): AudioNode {
    return this.delay.node
  }

  updateState(state: Record<string, unknown>): void {
    const delayState = state as DelayState
    this.delayTimeParam.setValueAtTime(delayState.time, this.audioContext.currentTime)
  }

  getRoute(): ModuleRouting {
    return {
      params: [
        { index: 0, label: 'Time CV', param: this.delayTimeParam }
      ],
      inputs: [
        { index: 0, label: 'Signal', node: this.delay.node, connectIndex: 1 },
        { index: 1, label: 'Reset', node: this.delay.node, connectIndex: 0 }
      ],
      outputs: [
        { index: 0, label: 'Out', node: this.delay.node, connectIndex: 0 }
      ]
    }
  }

  destroy(): void {
    this.delay?.free()
  }
}
