import { DelayNode as _DelayNode } from '@sobaka/dsp/wasm'
import { ModuleDSP, Route, RouteInfo } from '../../shared/types'
import { PlugType } from '@sobaka/state'

export interface DelayState {
  delay: number
}

const INITIAL_STATE: DelayState = {
  delay: 1.0
}

/**
 * DSP implementation for Delay module
 * Tap delay with multiple delay time outputs
 */
export class DelayNode implements ModuleDSP {
  static initialState = INITIAL_STATE
  public name = "delay"
  private delay?: _DelayNode
  private delayParam?: AudioParam
  public state: DelayState

  constructor(
    public readonly id: string,
    audioContext: AudioContext,
    initialState: DelayState = INITIAL_STATE,
    skipInit: boolean = false
  ) {
    this.state = initialState
    
    if (!skipInit) {
      this.delay = new _DelayNode(audioContext)
      this.delayParam = this.delay.node.parameters.get('delay')!
    }
  }

  getRoutingDefinition() {
    return {
      input: { name: "input", type: PlugType.Input, label: 'Signal' },
      delay: { name: "delay", type: PlugType.Param, label: 'Time CV' },
      out: { name: "out", type: PlugType.Output, label: 'out' },
    } satisfies Record<string, RouteInfo>
  }

  getRoute(routeName: string): Route {
    if (!this.delay) {
      return { node: new GainNode(new AudioContext()) }
    }
    
    switch (routeName) {
      case "input":
        return { node: this.delay.node, connectIndex: 0 }
      case "delay":
        return { node: this.delayParam! }
      case "out":
        return { node: this.delay.node, connectIndex: 0 }
      default:
        throw new Error(`Unknown routeName ${routeName}`)
    }
  }

  destroy(): void {
    this.delay?.free()
  }
}
