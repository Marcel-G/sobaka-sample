import { NoiseNode as _NoiseNode } from '@sobaka/dsp/wasm'
import { ModuleDSP, Route, RouteInfo } from '../../shared/types'
import { PlugType } from '@sobaka/state'

export interface NoiseState {
  // Noise module has no state
}

const INITIAL_STATE: NoiseState = {}

/**
 * DSP implementation for Noise module
 * White noise generator with no parameters
 */
export class NoiseNode implements ModuleDSP {
  static initialState = INITIAL_STATE
  public name = "noise"
  private noise?: _NoiseNode
  public state: NoiseState

  constructor(
    public readonly id: string,
    audioContext: AudioContext,
    initialState: NoiseState = INITIAL_STATE,
    noiseNode?: _NoiseNode
  ) {
    this.state = initialState
    this.noise = noiseNode ?? new _NoiseNode(audioContext)
  }

  getRoutingDefinition() {
    return {
      output: { name: "output", type: PlugType.Output, label: 'Noise' },
    } satisfies Record<string, RouteInfo>
  }

  getRoute(routeName: string): Route {
    if (!this.noise) {
      return { node: new GainNode(new AudioContext()) }
    }
    
    switch (routeName) {
      case "output":
        return { node: this.noise.node, connectIndex: 0 }
      default:
        throw new Error(`Unknown routeName ${routeName}`)
    }
  }

  destroy(): void {
    // NoiseNode cleanup if needed
  }
}
