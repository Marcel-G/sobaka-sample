import type { Oscillator, OscillatorShape } from 'sobaka-dsp'
import type { ModuleDSP, ModuleDSPFactory } from '../types'
import { registerDSPFactory } from '../types'
import { createPlugId, PlugType } from '@sobaka/state/models/links'
import type { NodeContext, ParamContext } from '@sobaka/state/context/plugs'

interface OscillatorState {
  pitch: number
  shape: number
}

const SHAPES: OscillatorShape[] = ['Sine', 'Square', 'Triangle', 'Saw']

/**
 * DSP implementation for Oscillator module
 * Manages Oscillator WASM node and its parameters
 */
export class OscillatorDSP implements ModuleDSP {
  private oscillator: Oscillator
  private node: AudioNode
  private pitchParam: AudioParam

  constructor(
    public readonly id: string,
    private audioContext: AudioContext,
    initialState: OscillatorState,
    oscillator: Oscillator
  ) {
    this.oscillator = oscillator
    this.node = oscillator.node()
    this.pitchParam = oscillator.get_param('Pitch')
    
    // Set initial state
    this.updateState(initialState)
  }

  updateState(state: Record<string, unknown>): void {
    const oscState = state as OscillatorState
    
    // Update pitch
    this.pitchParam.setValueAtTime(oscState.pitch, this.audioContext.currentTime)
    
    // Update shape
    const shape = SHAPES[oscState.shape]
    if (shape) {
      this.oscillator.command({ SetShape: shape })
    }
  }

  getPlugContexts(): Record<string, ParamContext | NodeContext> {
    return {
      // Pitch CV input (param)
      [createPlugId(this.id, PlugType.Param, 0)]: {
        type: PlugType.Param,
        param: this.pitchParam
      },
      // Reset input
      [createPlugId(this.id, PlugType.Input, 1)]: {
        type: PlugType.Input,
        module: this.node,
        connectIndex: 0
      },
      // Audio output
      [createPlugId(this.id, PlugType.Output, 0)]: {
        type: PlugType.Output,
        module: this.node,
        connectIndex: 0
      }
    }
  }

  destroy(): void {
    this.oscillator?.destroy()
    this.oscillator?.free()
  }
}

/**
 * Factory function for creating Oscillator DSP instances
 */
const createOscillatorDSP: ModuleDSPFactory = async (id, audioContext, initialState) => {
  const { Oscillator } = await import('sobaka-dsp')
  const oscillator = await Oscillator.create(audioContext)
  
  return new OscillatorDSP(id, audioContext, initialState as OscillatorState, oscillator)
}

// Register the factory
registerDSPFactory('Oscillator', createOscillatorDSP)

export default createOscillatorDSP
