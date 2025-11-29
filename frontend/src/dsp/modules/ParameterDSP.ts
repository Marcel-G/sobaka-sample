import type { ModuleDSP, ModuleDSPFactory } from '../types'
import { registerDSPFactory } from '../types'
import { createPlugId, PlugType } from '../../models/links'
import type { NodeContext, ParamContext } from '../../context/plugs'

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

  updateState(state: Record<string, unknown>): void {
    const paramState = state as ParameterState
    this.parameter.offset.setValueAtTime(paramState.value, this.audioContext.currentTime)
  }

  getPlugContexts(): Record<string, ParamContext | NodeContext> {
    return {
      // Output
      [createPlugId(this.id, PlugType.Output, 0)]: {
        type: PlugType.Output,
        module: this.parameter,
        connectIndex: 0
      }
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

/**
 * Factory function for creating Parameter DSP instances
 */
const createParameterDSP: ModuleDSPFactory = async (id, audioContext, initialState) => {
  return new ParameterDSP(id, audioContext, initialState as ParameterState)
}

// Register the factory
registerDSPFactory('Parameter', createParameterDSP)

export default createParameterDSP
