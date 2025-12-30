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
    delayNode: _DelayNode | null = null
  ) {
    this.state = initialState
    this.delay = delayNode === null ? new _DelayNode(audioContext) : delayNode
    
    if (this.delay) {
      this.delayParam = this.delay.node.parameters.get('delay')!
    }
  }

  getRoutingDefinition() {
    return {
      input: { name: "input", type: PlugType.Input, label: 'Signal' },
      delay: { name: "delay", type: PlugType.Param, label: 'Time CV' },
      tap_0: { name: "tap_0", type: PlugType.Output, label: 'Tap 1' },
      tap_1: { name: "tap_1", type: PlugType.Output, label: 'Tap 2' },
      tap_2: { name: "tap_2", type: PlugType.Output, label: 'Tap 3' },
      tap_3: { name: "tap_3", type: PlugType.Output, label: 'Tap 4' },
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
      case "tap_0":
        return { node: this.delay.node, connectIndex: 0 }
      case "tap_1":
        return { node: this.delay.node, connectIndex: 1 }
      case "tap_2":
        return { node: this.delay.node, connectIndex: 2 }
      case "tap_3":
        return { node: this.delay.node, connectIndex: 3 }
      default:
        throw new Error(`Unknown routeName ${routeName}`)
    }
  }

  destroy(): void {
    // DelayNode cleanup if needed
  }
}
