import { createPlugId, PlugType } from '@sobaka/state'

import { SampleAndHoldNode as _SampleAndHoldNode} from '@sobaka/dsp/wasm'
import { ModuleDSP } from '../../shared/types'
import { NodeContext, ParamContext } from '@sobaka/state/models/plugs'

interface VcaState {
  value: number
}

/**
 * DSP implementation for VCA (Voltage Controlled Amplifier) module
 * Uses native Web Audio API GainNode
 */
export class VcaDSP implements ModuleDSP {
  private vca: GainNode
  private gainParam: AudioParam

  constructor(
    public readonly id: string,
    private audioContext: AudioContext,
    initialState: VcaState
  ) {
    this.vca = new GainNode(audioContext)
    this.gainParam = this.vca.gain
    
    // Set initial state
    this.updateState(initialState)
  }

  updateState(state: Record<string, unknown>): void {
    const vcaState = state as VcaState
    this.gainParam.setValueAtTime(vcaState.value || 0, this.audioContext.currentTime)
  }

  getPlugContexts(): Record<string, ParamContext | NodeContext> {
    return {
      // Signal input
      [createPlugId(this.id, PlugType.Input, 0)]: {
        type: PlugType.Input,
        module: this.vca,
        connectIndex: 0
      },
      // CV input (controls gain)
      [createPlugId(this.id, PlugType.Param, 1)]: {
        type: PlugType.Param,
        param: this.gainParam
      },
      // Output
      [createPlugId(this.id, PlugType.Output, 0)]: {
        type: PlugType.Output,
        module: this.vca,
        connectIndex: 0
      }
    }
  }

  destroy(): void {
    // GainNode cleanup - will be garbage collected
  }
}
