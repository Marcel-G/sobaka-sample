import type { Reverb } from 'sobaka-dsp'
import type { ModuleDSP, ModuleDSPFactory } from '../types'
import { registerDSPFactory } from '../types'
import { createPlugId, PlugType } from '@sobaka/state/models/links'
import type { NodeContext, ParamContext } from '@sobaka/state/models/plugs'

interface ReverbState {
  wet: number
  length: number
}

/**
 * DSP implementation for Reverb module
 * Manages Reverb WASM node and its parameters
 */
export class ReverbDSP implements ModuleDSP {
  private reverb: Reverb
  private node: AudioNode
  private wetParam: AudioParam
  private delayParam: AudioParam

  constructor(
    public readonly id: string,
    private audioContext: AudioContext,
    initialState: ReverbState,
    reverb: Reverb
  ) {
    this.reverb = reverb
    this.node = reverb.node()
    this.wetParam = reverb.get_param('Wet')
    this.delayParam = reverb.get_param('Delay')
    
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
        module: this.node,
        connectIndex: 0
      },
      // Right input
      [createPlugId(this.id, PlugType.Input, 1)]: {
        type: PlugType.Input,
        module: this.node,
        connectIndex: 1
      },
      // Left output
      [createPlugId(this.id, PlugType.Output, 0)]: {
        type: PlugType.Output,
        module: this.node,
        connectIndex: 0
      },
      // Right output
      [createPlugId(this.id, PlugType.Output, 1)]: {
        type: PlugType.Output,
        module: this.node,
        connectIndex: 1
      }
    }
  }

  destroy(): void {
    this.reverb?.destroy()
    this.reverb?.free()
  }
}

/**
 * Factory function for creating Reverb DSP instances
 */
const createReverbDSP: ModuleDSPFactory = async (id, audioContext, initialState) => {
  const { Reverb } = await import('sobaka-dsp')
  const reverb = await Reverb.create(audioContext)
  
  return new ReverbDSP(id, audioContext, initialState as ReverbState, reverb)
}

// Register the factory
registerDSPFactory('Reverb', createReverbDSP)

export default createReverbDSP
