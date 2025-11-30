import { OscillatorNode as _OscillatorNode, OscillatorShape} from '@sobaka/dsp/wasm'
import { ModuleDSP, ModuleRouting } from '../../shared/types'

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

  get node(): AudioNode {
    return this.oscillator.node
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

  getRouting(): ModuleRouting {
    return {
      params: [
        { index: 0, label: 'Pitch CV', param: this.pitchParam }
      ],
      inputs: [
        { index: 1, label: 'Reset', node: this.oscillator.node, connectIndex: 0 }
      ],
      outputs: [
        { index: 0, label: 'Out', node: this.oscillator.node, connectIndex: 0 }
      ]
    }
  }

  destroy(): void {
    this.oscillator?.free()
  }
}
