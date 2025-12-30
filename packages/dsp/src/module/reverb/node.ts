import { ReverbNode as _ReverbNode } from '@sobaka/dsp/wasm'
import { ModuleDSP, Route, RouteInfo } from '../../shared/types'
import { PlugType } from '@sobaka/state'

export interface ReverbState {
  // Reverb currently has no parameters in the processor
}

const INITIAL_STATE: ReverbState = {}

/**
 * DSP implementation for Reverb module
 * Stereo reverb effect
 */
export class ReverbNode implements ModuleDSP {
  static initialState = INITIAL_STATE
  public name = "reverb"
  private reverb?: _ReverbNode
  public state: ReverbState

  constructor(
    public readonly id: string,
    audioContext: AudioContext,
    initialState: ReverbState = INITIAL_STATE,
    reverbNode?: _ReverbNode
  ) {
    this.state = initialState
    this.reverb = reverbNode ?? new _ReverbNode(audioContext)
  }

  getRoutingDefinition() {
    return {
      input: { name: "input", type: PlugType.Input, label: 'In' },
      output: { name: "output", type: PlugType.Output, label: 'Out' },
    } satisfies Record<string, RouteInfo>
  }

  getRoute(routeName: string): Route {
    if (!this.reverb) {
      return { node: new GainNode(new AudioContext()) }
    }
    
    switch (routeName) {
      case "input":
        return { node: this.reverb.node, connectIndex: 0 }
      case "output":
        return { node: this.reverb.node, connectIndex: 0 }
      default:
        throw new Error(`Unknown routeName ${routeName}`)
    }
  }

  destroy(): void {
    // ReverbNode cleanup if needed
  }
}
