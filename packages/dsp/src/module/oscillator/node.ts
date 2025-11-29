import { createPlugId, PlugType } from '@sobaka/state'

import { OscillatorNode as _OscillatorNode, OscillatorShape} from '@sobaka/dsp/wasm'
import { ModuleDSP } from '../../shared/types'
import { NodeContext, ParamContext } from '@sobaka/state/models/plugs'


interface OscillatorState {
  pitch: number
  shape: number
}

const SHAPES: OscillatorShape[] = [OscillatorShape.Sine, OscillatorShape.Square, OscillatorShape.Triangle, OscillatorShape.Saw]

/**
 * DSP implementation for Oscillator module
 * Manages Oscillator WASM node and its parameters
 */
export class OscillatorDSP implements ModuleDSP {
  private oscillator: _OscillatorNode
  private pitchParam: AudioParam

  constructor(
    public readonly id: string,
    private audioContext: AudioContext,
    initialState: OscillatorState,
    oscillator: _OscillatorNode
  ) {
    this.oscillator = oscillator
    this.pitchParam = oscillator.node.parameters.get('Pitch')
    
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
      this.oscillator.set_shape(shape)
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
        module: this.oscillator.node,
        connectIndex: 0
      },
      // Audio output
      [createPlugId(this.id, PlugType.Output, 0)]: {
        type: PlugType.Output,
        module: this.oscillator.node,
        connectIndex: 0
      }
    }
  }

  destroy(): void {
    this.oscillator?.free()
  }
}
