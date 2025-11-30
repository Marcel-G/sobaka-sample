import { EnvelopeNode as _EnvelopeNode } from '@sobaka/dsp/wasm'
import { ModuleDSP, ModuleRouting } from '../../shared/types'

interface EnvelopeState {
  attack: number
  decay: number
  sustain: number
  release: number
}

/**
 * DSP implementation for Envelope module
 * Manages Envelope WASM node and its ADSR parameters
 */
export class EnvelopeDSP implements ModuleDSP {
  private envelope: _EnvelopeNode
  private attackParam: AudioParam
  private decayParam: AudioParam
  private sustainParam: AudioParam
  private releaseParam: AudioParam

  constructor(
    public readonly id: string,
    private audioContext: AudioContext,
    initialState: EnvelopeState,
    envelope: _EnvelopeNode
  ) {
    this.envelope = envelope
    this.attackParam = this.envelope.node.parameters.get('Attack')
    this.decayParam = this.envelope.node.parameters.get('Decay')
    this.sustainParam = this.envelope.node.parameters.get('Sustain')
    this.releaseParam = this.envelope.node.parameters.get('Release')
    
    // Set initial state
    this.updateState(initialState)
  }

  get node(): AudioNode {
    return this.envelope.node
  }

  updateState(state: Record<string, unknown>): void {
    const envState = state as EnvelopeState
    
    this.attackParam.setValueAtTime(envState.attack, this.audioContext.currentTime)
    this.decayParam.setValueAtTime(envState.decay, this.audioContext.currentTime)
    this.sustainParam.setValueAtTime(envState.sustain, this.audioContext.currentTime)
    this.releaseParam.setValueAtTime(envState.release, this.audioContext.currentTime)
  }

  getRouting(): ModuleRouting {
    return {
      inputs: [
        { index: 0, label: 'Gate', node: this.envelope.node, connectIndex: 0 }
      ],
      outputs: [
        { index: 0, label: 'Envelope', node: this.envelope.node, connectIndex: 0 }
      ]
    }
  }

  destroy(): void {
    this.envelope?.free()
  }
}
