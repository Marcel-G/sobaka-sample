import type { ModuleDSP, ModuleDSPFactory } from '../types'
import { registerDSPFactory } from '../types'
import { createPlugId, PlugType } from '../../models/links'
import type { NodeContext, ParamContext } from '../../context/plugs'

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

/**
 * Factory function for creating VCA DSP instances
 */
const createVcaDSP: ModuleDSPFactory = async (id, audioContext, initialState) => {
  return new VcaDSP(id, audioContext, initialState as VcaState)
}

// Register the factory
registerDSPFactory('Vca', createVcaDSP)

export default createVcaDSP
