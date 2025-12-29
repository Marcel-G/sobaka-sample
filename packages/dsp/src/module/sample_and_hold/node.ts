import { SampleAndHoldNode as _SampleAndHoldNode } from '@sobaka/dsp/wasm'
import { ModuleDSP, Route, RouteInfo } from '../../shared/types'
import { PlugType } from '@sobaka/state'

export interface SampleAndHoldState {
  // Sample and hold has no parameters
}

const INITIAL_STATE: SampleAndHoldState = {}

/**
 * DSP implementation for Sample and Hold module
 * Samples input signal when gate goes high
 */
export class SampleAndHoldNode implements ModuleDSP {
  static initialState = INITIAL_STATE
  public name = "S & H"
  private sampleAndHold: _SampleAndHoldNode
  public state: SampleAndHoldState

  constructor(
    public readonly id: string,
    audioContext: AudioContext,
    initialState: SampleAndHoldState = INITIAL_STATE
  ) {
    this.sampleAndHold = new _SampleAndHoldNode(audioContext)
    this.state = initialState
  }

  getRoutingDefinition() {
    return {
      gate: { name: "gate", type: PlugType.Input, label: 'Gate' },
      signal: { name: "signal", type: PlugType.Input, label: 'Signal' },
      output: { name: "output", type: PlugType.Output, label: 'Out' },
    } satisfies Record<string, RouteInfo>
  }

  getRoute(routeName: string): Route {
    switch (routeName) {
      case "gate":
        return { node: this.sampleAndHold.node, connectIndex: 0 }
      case "signal":
        return { node: this.sampleAndHold.node, connectIndex: 1 }
      case "output":
        return { node: this.sampleAndHold.node, connectIndex: 0 }
      default:
        throw new Error(`Unknown routeName ${routeName}`)
    }
  }

  destroy(): void {
    // SampleAndHoldNode cleanup if needed
  }
}
