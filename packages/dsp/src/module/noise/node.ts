import { createPlugId, PlugType } from '@sobaka/state'

import { NoiseNode as _NoiseNode} from '@sobaka/dsp/wasm'
import { ModuleDSP } from '../../shared/types'
import { NodeContext, ParamContext } from '@sobaka/state/models/plugs'


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

  updateState(_state: Record<string, unknown>): void {
    // Noise has no state to update
  }

  getPlugContexts(): Record<string, ParamContext | NodeContext> {
    return {
      // Noise output
      [createPlugId(this.id, PlugType.Output, 0)]: {
        type: PlugType.Output,
        module: this.noise.node,
        connectIndex: 0
      }
    }
  }

  destroy(): void {
    this.noise?.free()
  }
}

