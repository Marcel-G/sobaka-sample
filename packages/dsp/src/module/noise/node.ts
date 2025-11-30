import { NoiseNode as _NoiseNode} from '@sobaka/dsp/wasm'
import { ModuleDSP, ModuleRouting } from '../../shared/types'

/**
 * DSP implementation for Noise module
 * Manages Noise WASM node (no parameters needed)
 */
export class NoiseDSP implements ModuleDSP {
  private noise: _NoiseNode

  constructor(
    public readonly id: string,
    private audioContext: AudioContext,
    initialState: Record<string, never>,
    noise: _NoiseNode
  ) {
    this.noise = noise
  }

  get node(): AudioNode {
    return this.noise.node
  }

  updateState(_state: Record<string, unknown>): void {
    // Noise has no state to update
  }

  getRouting(): ModuleRouting {
    return {
      outputs: [
        { index: 0, label: 'Noise', node: this.noise.node, connectIndex: 0 }
      ]
    }
  }

  destroy(): void {
    this.noise?.free()
  }
}
