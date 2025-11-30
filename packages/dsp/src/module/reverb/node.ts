import { ReverbNode as _ReverbNode} from '@sobaka/dsp/wasm'
import { ModuleDSP, ModuleRouting } from '../../shared/types'

interface ReverbState {
  wet: number
  length: number
}

/**
 * DSP implementation for Reverb module
 * Manages Reverb WASM node and its parameters
 */
export class ReverbDSP implements ModuleDSP {
  private reverb: _ReverbNode
  private wetParam: AudioParam
  private delayParam: AudioParam

  constructor(
    public readonly id: string,
    private audioContext: AudioContext,
    initialState: ReverbState,
    reverb: _ReverbNode
  ) {
    this.reverb = reverb
    this.wetParam = reverb.node.parameters.get('Wet')
    this.delayParam = reverb.node.parameters.get('Delay')
    
    // Set initial state
    this.updateState(initialState)
  }

  get node(): AudioNode {
    return this.reverb.node
  }

  updateState(state: Record<string, unknown>): void {
    const reverbState = state as ReverbState
    
    this.wetParam.setValueAtTime(reverbState.wet, this.audioContext.currentTime)
    this.delayParam.setValueAtTime(reverbState.length, this.audioContext.currentTime)
  }

  getRoute(): ModuleRouting {
    return {
      inputs: [
        { index: 0, label: 'In L', node: this.reverb.node, connectIndex: 0 },
        { index: 1, label: 'In R', node: this.reverb.node, connectIndex: 1 }
      ],
      outputs: [
        { index: 0, label: 'Out L', node: this.reverb.node, connectIndex: 0 },
        { index: 1, label: 'Out R', node: this.reverb.node, connectIndex: 1 }
      ]
    }
  }

  destroy(): void {
    this.reverb?.free()
  }
}
