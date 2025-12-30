import { ClockDividerNode as _ClockDividerNode } from '@sobaka/dsp/wasm'
import { ModuleDSP, Route, RouteInfo } from '../../shared/types'
import { PlugType } from '@sobaka/state'

export interface ClockState {
  bpm: number
}

const INITIAL_STATE: ClockState = { bpm: 120 }

/**
 * DSP implementation for Clock module
 * Manages ClockDividerNode and its parameters
 */
export class ClockNode implements ModuleDSP {
  static initialState = INITIAL_STATE
  public name = "clock"
  private clock?: _ClockDividerNode
  private bpmParam?: AudioParam
  public state: ClockState

  constructor(
    public readonly id: string,
    audioContext: AudioContext,
    initialState: ClockState = INITIAL_STATE,
    skipInit: boolean = false
  ) {
    this.state = initialState
    
    if (!skipInit) {
      this.clock = new _ClockDividerNode(audioContext)
      this.bpmParam = this.clock.node.parameters.get('bpm')!
    }
  }

  getRoutingDefinition() {
    return {
      bpm:      { name: "bpm", type: PlugType.Param, label: 'BPM CV' },
      output_0: { name: "output_0", type: PlugType.Output, label: '1/1' },
      output_1: { name: "output_1", type: PlugType.Output, label: '1/2' },
      output_2: { name: "output_2", type: PlugType.Output, label: '1/4' },
      output_3: { name: "output_3", type: PlugType.Output, label: '1/8' },
      output_4: { name: "output_4", type: PlugType.Output, label: '1/16' },
    } satisfies Record<string, RouteInfo>
  }

  getRoute(routeName: string): Route {
    if (!this.clock) {
      return { node: new GainNode(new AudioContext()) }
    }
    
    switch (routeName){
      case "bpm":
        return { node: this.bpmParam! }
      case "output_0":
        return { node: this.clock.node, connectIndex: 0 }
      case "output_1":
        return { node: this.clock.node, connectIndex: 1 }
      case "output_2":
        return { node: this.clock.node, connectIndex: 2 }
      case "output_3":
        return { node: this.clock.node, connectIndex: 3 }
      case "output_4":
        return { node: this.clock.node, connectIndex: 4 }
      default:
        throw new Error(`Unknown routeName ${routeName}`)
    }
  }

  destroy(): void {
    // ClockDividerNode cleanup if needed
    // The node will be garbage collected when no longer referenced
  }
}
