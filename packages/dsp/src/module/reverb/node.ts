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
  private reverb: _ReverbNode
  public state: ReverbState

  constructor(
    public readonly id: string,
    audioContext: AudioContext,
    initialState: ReverbState = INITIAL_STATE
  ) {
    this.reverb = new _ReverbNode(audioContext)
    this.state = initialState
  }

  getRoutingDefinition() {
    return {
      input: { name: "input", type: PlugType.Input, label: 'In' },
      left: { name: "left", type: PlugType.Output, label: 'L' },
      right: { name: "right", type: PlugType.Output, label: 'R' },
    } satisfies Record<string, RouteInfo>
  }

  getRoute(routeName: string): Route {
    switch (routeName) {
      case "input":
        return { node: this.reverb.node, connectIndex: 0 }
      case "left":
        return { node: this.reverb.node, connectIndex: 0 }
      case "right":
        return { node: this.reverb.node, connectIndex: 1 }
      default:
        throw new Error(`Unknown routeName ${routeName}`)
    }
  }

  destroy(): void {
    // ReverbNode cleanup if needed
  }
}
