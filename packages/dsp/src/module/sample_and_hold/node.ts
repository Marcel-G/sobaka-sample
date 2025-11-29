import { createPlugId, PlugType } from '@sobaka/state'

import { SampleAndHoldNode as _SampleAndHoldNode} from '@sobaka/dsp/wasm'
import { ModuleDSP } from '../../shared/types'
import { NodeContext, ParamContext } from '@sobaka/state/models/plugs'

/**
 * DSP implementation for Sample & Hold module
 * Manages SampleAndHold WASM node (no parameters)
 */
export class SampleAndHoldDSP implements ModuleDSP {
  private sampleAndHold: _SampleAndHoldNode

  constructor(
    public readonly id: string,
    private audioContext: AudioContext,
    initialState: Record<string, never>,
    sampleAndHold: _SampleAndHoldNode
  ) {
    this.sampleAndHold = sampleAndHold
  }

  updateState(_state: Record<string, unknown>): void {
    // Sample & Hold has no state to update
  }

  getPlugContexts(): Record<string, ParamContext | NodeContext> {
    return {
      // Signal input
      [createPlugId(this.id, PlugType.Input, 0)]: {
        type: PlugType.Input,
        module: this.sampleAndHold.node,
        connectIndex: 0
      },
      // Gate input
      [createPlugId(this.id, PlugType.Input, 1)]: {
        type: PlugType.Input,
        module: this.sampleAndHold.node,
        connectIndex: 1
      },
      // Output
      [createPlugId(this.id, PlugType.Output, 0)]: {
        type: PlugType.Output,
        module: this.sampleAndHold.node,
        connectIndex: 0
      }
    }
  }

  destroy(): void {
    this.sampleAndHold?.free()
  }
}

