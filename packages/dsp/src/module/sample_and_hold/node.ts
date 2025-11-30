import { SampleAndHoldNode as _SampleAndHoldNode} from '@sobaka/dsp/wasm'
import { ModuleDSP, ModuleRouting } from '../../shared/types'

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

  get node(): AudioNode {
    return this.sampleAndHold.node
  }

  updateState(_state: Record<string, unknown>): void {
    // Sample & Hold has no state to update
  }

  getRouting(): ModuleRouting {
    return {
      inputs: [
        { index: 0, label: 'Signal', node: this.sampleAndHold.node, connectIndex: 0 },
        { index: 1, label: 'Gate', node: this.sampleAndHold.node, connectIndex: 1 }
      ],
      outputs: [
        { index: 0, label: 'Out', node: this.sampleAndHold.node, connectIndex: 0 }
      ]
    }
  }

  destroy(): void {
    this.sampleAndHold?.free()
  }
}
