import { OscillatorNode as _OscillatorNode, OscillatorShape } from '@sobaka/dsp/wasm'
import { ModuleDSP, Route, RouteInfo } from '../../shared/types'
import { PlugType } from '@sobaka/state'

export interface OscillatorState {
  pitch: number
  shape: number
}

const INITIAL_STATE: OscillatorState = { pitch: 1.0, shape: 3 } // Default to Saw

const SHAPES: OscillatorShape[] = [
  OscillatorShape.Sine,
  OscillatorShape.Square,
  OscillatorShape.Triangle,
  OscillatorShape.Saw
]

/**
 * DSP implementation for Oscillator module
 * Manages OscillatorNode and its parameters
 */
export class OscillatorNode implements ModuleDSP {
  public name = "oscillator"
  private oscillator: _OscillatorNode
  private pitchParam: AudioParam
  public state: OscillatorState

  constructor(
    public readonly id: string,
    audioContext: AudioContext,
    initialState: OscillatorState = INITIAL_STATE
  ) {
    this.oscillator = new _OscillatorNode(audioContext)
    this.pitchParam = this.oscillator.node.parameters.get('pitch')!
    this.state = initialState
    
    // Set initial shape
    this.oscillator.setShape(SHAPES[this.state.shape])
  }

  getRoutingDefinition() {
    return {
      pitch: { name: "pitch", type: PlugType.Param, label: 'Pitch CV' },
      output: { name: "output", type: PlugType.Output, label: 'Out' },
    } satisfies Record<string, RouteInfo>
  }

  getRoute(routeName: string): Route {
    switch (routeName) {
      case "pitch":
        return { node: this.pitchParam }
      case "output":
        return { node: this.oscillator.node, connectIndex: 0 }
      default:
        throw new Error(`Unknown routeName ${routeName}`)
    }
  }

  setShape(shapeIndex: number) {
    const shape = SHAPES[shapeIndex]
    if (shape) {
      this.oscillator.setShape(shape)
      this.state.shape = shapeIndex
    }
  }

  destroy(): void {
    // OscillatorNode cleanup if needed
  }
}
