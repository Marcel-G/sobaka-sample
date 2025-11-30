import { ModuleDSP, ModuleRouting } from '../../shared/types'

interface ParameterState {
  min: number
  max: number
  value: number
}

/**
 * DSP implementation for Parameter module
 * Uses native Web Audio API ConstantSourceNode
 */
export class ParameterDSP implements ModuleDSP {
  private parameter: ConstantSourceNode

  constructor(
    public readonly id: string,
    private audioContext: AudioContext,
    initialState: ParameterState
  ) {
    this.parameter = new ConstantSourceNode(audioContext)
    this.parameter.start()
    
    // Set initial state
    this.updateState(initialState)
  }

  get node(): AudioNode {
    return this.parameter
  }

  updateState(state: Record<string, unknown>): void {
    const paramState = state as ParameterState
    this.parameter.offset.setValueAtTime(paramState.value, this.audioContext.currentTime)
  }

  getRouting(): ModuleRouting {
    return {
      outputs: [
        { index: 0, label: 'Out', node: this.parameter, connectIndex: 0 }
      ]
    }
  }

  destroy(): void {
    try {
      this.parameter.stop()
    } catch {
      // May already be stopped
    }
  }
}
