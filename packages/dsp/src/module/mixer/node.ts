import { ModuleDSP, ModuleRouting } from '../../shared/types'

interface MixerState {
  volume: number
  muted: boolean
}

/**
 * DSP implementation for Mixer module
 * Mixes multiple inputs to stereo output with volume control
 * Uses native Web Audio API GainNode
 */
export class MixerDSP implements ModuleDSP {
  private mixer: GainNode
  private volumeParam: AudioParam

  constructor(
    public readonly id: string,
    private audioContext: AudioContext,
    initialState: MixerState
  ) {
    this.mixer = new GainNode(audioContext)
    this.volumeParam = this.mixer.gain
    
    // Set initial state
    this.updateState(initialState)
  }

  get node(): AudioNode {
    return this.mixer
  }

  updateState(state: Record<string, unknown>): void {
    const mixerState = state as MixerState
    const targetVolume = mixerState.muted ? 0 : mixerState.volume
    
    // Smooth volume changes to avoid clicks
    this.volumeParam.setTargetAtTime(
      targetVolume,
      this.audioContext.currentTime,
      0.01
    )
  }

  getRouting(): ModuleRouting {
    return {
      inputs: [
        { index: 0, label: 'In 1', node: this.mixer },
        { index: 1, label: 'In 2', node: this.mixer },
        { index: 2, label: 'In 3', node: this.mixer },
        { index: 3, label: 'In 4', node: this.mixer }
      ],
      params: [
        { index: 0, label: 'Volume CV', param: this.volumeParam }
      ],
      outputs: [
        { index: 0, label: 'Out', node: this.mixer }
      ]
    }
  }

  destroy(): void {
    // GainNode cleanup - will be garbage collected
  }
}
