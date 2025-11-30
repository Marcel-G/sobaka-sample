import { ModuleDSP, ModuleRouting } from '../../shared/types'

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

  get node(): AudioNode {
    return this.vca
  }

  updateState(state: Record<string, unknown>): void {
    const vcaState = state as VcaState
    this.gainParam.setValueAtTime(vcaState.value || 0, this.audioContext.currentTime)
  }

  getRouting(): ModuleRouting {
    return {
      inputs: [
        { index: 0, label: 'Signal', node: this.vca }
      ],
      params: [
        { index: 1, label: 'CV', param: this.gainParam }
      ],
      outputs: [
        { index: 0, label: 'Out', node: this.vca }
      ]
    }
  }

  destroy(): void {
    // GainNode cleanup - will be garbage collected
  }
}
