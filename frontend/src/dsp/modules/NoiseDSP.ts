import type { Noise } from 'sobaka-dsp'
import type { ModuleDSP, ModuleDSPFactory } from '../types'
import { registerDSPFactory } from '../types'
import { createPlugId, PlugType } from '../../models/links'
import type { NodeContext, ParamContext } from '../../context/plugs'

/**
 * DSP implementation for Noise module
 * Manages Noise WASM node (no parameters needed)
 */
export class NoiseDSP implements ModuleDSP {
  private noise: Noise
  private node: AudioNode

  constructor(
    public readonly id: string,
    private audioContext: AudioContext,
    initialState: Record<string, never>,
    noise: Noise
  ) {
    this.noise = noise
    this.node = noise.node()
  }

  updateState(_state: Record<string, unknown>): void {
    // Noise has no state to update
  }

  getPlugContexts(): Record<string, ParamContext | NodeContext> {
    return {
      // Noise output
      [createPlugId(this.id, PlugType.Output, 0)]: {
        type: PlugType.Output,
        module: this.node,
        connectIndex: 0
      }
    }
  }

  destroy(): void {
    this.noise?.destroy()
    this.noise?.free()
  }
}

/**
 * Factory function for creating Noise DSP instances
 */
const createNoiseDSP: ModuleDSPFactory = async (id, audioContext, initialState) => {
  const { Noise } = await import('sobaka-dsp')
  const noise = await Noise.create(audioContext)
  
  return new NoiseDSP(id, audioContext, initialState as Record<string, never>, noise)
}

// Register the factory
registerDSPFactory('Noise', createNoiseDSP)

export default createNoiseDSP
