import type { Envelope } from 'sobaka-dsp'
import type { ModuleDSP, ModuleDSPFactory } from '../types'
import { registerDSPFactory } from '../types'
import { createPlugId, PlugType } from '../../models/links'
import type { NodeContext, ParamContext } from '../../context/plugs'

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
  private envelope: Envelope
  private node: AudioNode
  private attackParam: AudioParam
  private decayParam: AudioParam
  private sustainParam: AudioParam
  private releaseParam: AudioParam

  constructor(
    public readonly id: string,
    private audioContext: AudioContext,
    initialState: EnvelopeState,
    envelope: Envelope
  ) {
    this.envelope = envelope
    this.node = envelope.node()
    this.attackParam = envelope.get_param('Attack')
    this.decayParam = envelope.get_param('Decay')
    this.sustainParam = envelope.get_param('Sustain')
    this.releaseParam = envelope.get_param('Release')
    
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
        module: this.node,
        connectIndex: 0
      },
      // Envelope output
      [createPlugId(this.id, PlugType.Output, 0)]: {
        type: PlugType.Output,
        module: this.node,
        connectIndex: 0
      }
    }
  }

  destroy(): void {
    this.envelope?.destroy()
    this.envelope?.free()
  }
}

/**
 * Factory function for creating Envelope DSP instances
 */
const createEnvelopeDSP: ModuleDSPFactory = async (id, audioContext, initialState) => {
  const { Envelope } = await import('sobaka-dsp')
  const envelope = await Envelope.create(audioContext)
  
  return new EnvelopeDSP(id, audioContext, initialState as EnvelopeState, envelope)
}

// Register the factory
registerDSPFactory('Envelope', createEnvelopeDSP)

export default createEnvelopeDSP
