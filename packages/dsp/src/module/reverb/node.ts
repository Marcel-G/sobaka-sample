import { createPlugId, PlugType } from '@sobaka/state'

import { ReverbNode as _ReverbNode} from '@sobaka/dsp/wasm'
import { ModuleDSP } from '../../shared/types'
import { NodeContext, ParamContext } from '@sobaka/state/models/plugs'

interface ReverbState {
  wet: number
  length: number
}

/**
 * DSP implementation for Reverb module
 * Manages Reverb WASM node and its parameters
 */
export class ReverbDSP implements ModuleDSP {
  private reverb: _ReverbNode
  private wetParam: AudioParam
  private delayParam: AudioParam

  constructor(
    public readonly id: string,
    private audioContext: AudioContext,
    initialState: ReverbState,
    reverb: _ReverbNode
  ) {
    this.reverb = reverb
    this.wetParam = reverb.node.parameters.get('Wet')
    this.delayParam = reverb.node.parameters.get('Delay')
    
    // Set initial state
    this.updateState(initialState)
  }

  updateState(state: Record<string, unknown>): void {
    const reverbState = state as ReverbState
    
    this.wetParam.setValueAtTime(reverbState.wet, this.audioContext.currentTime)
    this.delayParam.setValueAtTime(reverbState.length, this.audioContext.currentTime)
  }

  getPlugContexts(): Record<string, ParamContext | NodeContext> {
    return {
      // Left input
      [createPlugId(this.id, PlugType.Input, 0)]: {
        type: PlugType.Input,
        module: this.reverb.node,
        connectIndex: 0
      },
      // Right input
      [createPlugId(this.id, PlugType.Input, 1)]: {
        type: PlugType.Input,
        module: this.reverb.node,
        connectIndex: 1
      },
      // Left output
      [createPlugId(this.id, PlugType.Output, 0)]: {
        type: PlugType.Output,
        module: this.reverb.node,
        connectIndex: 0
      },
      // Right output
      [createPlugId(this.id, PlugType.Output, 1)]: {
        type: PlugType.Output,
        module: this.reverb.node,
        connectIndex: 1
      }
    }
  }

  destroy(): void {
    this.reverb?.free()
  }
}
