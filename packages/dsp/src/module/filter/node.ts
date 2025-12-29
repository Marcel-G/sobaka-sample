import { FilterNode as _FilterNode } from '@sobaka/dsp/wasm'
import { ModuleDSP, Route, RouteInfo } from '../../shared/types'
import { PlugType } from '@sobaka/state'

export interface FilterState {
  frequency: number
  q: number
}

const INITIAL_STATE: FilterState = {
  frequency: 0.1,
  q: 0.1
}

/**
 * DSP implementation for Filter module
 * Multi-mode filter with lowpass, highpass, bandpass, and moog outputs
 */
export class FilterNode implements ModuleDSP {
  static initialState = INITIAL_STATE
  public name = "filter"
  private filter: _FilterNode
  private frequencyParam: AudioParam
  private qParam: AudioParam
  public state: FilterState

  constructor(
    public readonly id: string,
    audioContext: AudioContext,
    initialState: FilterState = INITIAL_STATE
  ) {
    this.filter = new _FilterNode(audioContext)
    this.frequencyParam = this.filter.node.parameters.get('frequency')!
    this.qParam = this.filter.node.parameters.get('q')!
    this.state = initialState
  }

  getRoutingDefinition() {
    return {
      input: { name: "input", type: PlugType.Input, label: 'Signal' },
      frequency: { name: "frequency", type: PlugType.Param, label: 'Cutoff CV' },
      q: { name: "q", type: PlugType.Param, label: 'Q CV' },
      lowpass: { name: "lowpass", type: PlugType.Output, label: 'Lowpass' },
      highpass: { name: "highpass", type: PlugType.Output, label: 'Highpass' },
      bandpass: { name: "bandpass", type: PlugType.Output, label: 'Bandpass' },
      moog: { name: "moog", type: PlugType.Output, label: 'Moog' },
    } satisfies Record<string, RouteInfo>
  }

  getRoute(routeName: string): Route {
    switch (routeName) {
      case "input":
        return { node: this.filter.node, connectIndex: 0 }
      case "frequency":
        return { node: this.frequencyParam }
      case "q":
        return { node: this.qParam }
      case "lowpass":
        return { node: this.filter.node, connectIndex: 0 }
      case "highpass":
        return { node: this.filter.node, connectIndex: 1 }
      case "bandpass":
        return { node: this.filter.node, connectIndex: 2 }
      case "moog":
        return { node: this.filter.node, connectIndex: 3 }
      default:
        throw new Error(`Unknown routeName ${routeName}`)
    }
  }

  destroy(): void {
    // FilterNode cleanup if needed
  }
}
