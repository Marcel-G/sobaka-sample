import type { ModuleDSP, ModuleDSPFactory } from '../types'
import { registerDSPFactory } from '../types'
import { createPlugId, PlugType } from '../../models/links'
import type { NodeContext, ParamContext } from '../../context/plugs'

interface LfoState {
  bpm: number
}

/**
 * DSP implementation for LFO (Low Frequency Oscillator) module
 * Uses native Web Audio API OscillatorNode
 */
export class LfoDSP implements ModuleDSP {
  private lfo: OscillatorNode

  constructor(
    public readonly id: string,
    private audioContext: AudioContext,
    initialState: LfoState
  ) {
    this.lfo = new OscillatorNode(audioContext, { type: 'sine' })
    this.lfo.start()
    
    // Set initial state
    this.updateState(initialState)
  }

  updateState(state: Record<string, unknown>): void {
    const lfoState = state as LfoState
    // Convert BPM to Hz
    this.lfo.frequency.setValueAtTime(
      (lfoState.bpm || 0) / 60,
      this.audioContext.currentTime
    )
  }

  getPlugContexts(): Record<string, ParamContext | NodeContext> {
    return {
      // Signal output
      [createPlugId(this.id, PlugType.Output, 0)]: {
        type: PlugType.Output,
        module: this.lfo,
        connectIndex: 0
      }
    }
  }

  destroy(): void {
    try {
      this.lfo.stop()
    } catch {
      // Oscillator may already be stopped
    }
  }
}

/**
 * Factory function for creating LFO DSP instances
 */
const createLfoDSP: ModuleDSPFactory = async (id, audioContext, initialState) => {
  return new LfoDSP(id, audioContext, initialState as LfoState)
}

// Register the factory
registerDSPFactory('Lfo', createLfoDSP)

export default createLfoDSP
