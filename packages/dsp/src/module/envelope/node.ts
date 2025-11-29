import { createPlugId, PlugType } from '@sobaka/state'

import { EnvelopeNode as _EnvelopeNode } from '@sobaka/dsp/wasm'
import { ModuleDSP } from '../../shared/types'
import { NodeContext, ParamContext } from '@sobaka/state/models/plugs'

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

  updateState(state: Record<string, unknown>): void {
    const envState = state as EnvelopeState
    
    this.attackParam.setValueAtTime(envState.attack, this.audioContext.currentTime)
    this.decayParam.setValueAtTime(envState.decay, this.audioContext.currentTime)
    this.sustainParam.setValueAtTime(envState.sustain, this.audioContext.currentTime)
    this.releaseParam.setValueAtTime(envState.release, this.audioContext.currentTime)
  }

  getPlugContexts(): Record<string, ParamContext | NodeContext> {
    return {
      // Gate input
      [createPlugId(this.id, PlugType.Input, 0)]: {
        type: PlugType.Input,
        module: this.envelope.node,
        connectIndex: 0
      },
      // Envelope output
      [createPlugId(this.id, PlugType.Output, 0)]: {
        type: PlugType.Output,
        module: this.envelope.node,
        connectIndex: 0
      }
    }
  }

  destroy(): void {
    this.envelope?.free()
  }
}

