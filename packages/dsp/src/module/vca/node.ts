import { ModuleDSP, Route, RouteInfo } from '../../shared/types'
import { PlugType } from '@sobaka/state'

export interface VcaState {
  value: number
}

const INITIAL_STATE: VcaState = {
  value: 0.5
}

/**
 * DSP implementation for VCA (Voltage Controlled Amplifier) module
 * Uses native Web Audio GainNode for amplification/attenuation
 */
export class VcaNode implements ModuleDSP {
  public name = "vca"
  private vca: GainNode
  public state: VcaState

  constructor(
    public readonly id: string,
    audioContext: AudioContext,
    initialState: VcaState = INITIAL_STATE
  ) {
    this.vca = new GainNode(audioContext)
    this.state = initialState
    
    // Set initial gain value
    this.vca.gain.setValueAtTime(this.state.value, audioContext.currentTime)
  }

  getRoutingDefinition() {
    return {
      input: { name: "input", type: PlugType.Input, label: 'Signal' },
      cv: { name: "cv", type: PlugType.Param, label: 'CV' },
      output: { name: "output", type: PlugType.Output, label: 'Out' },
    } satisfies Record<string, RouteInfo>
  }

  getRoute(routeName: string): Route {
    switch (routeName) {
      case "input":
        return { node: this.vca, connectIndex: 0 }
      case "cv":
        return { node: this.vca.gain }
      case "output":
        return { node: this.vca, connectIndex: 0 }
      default:
        throw new Error(`Unknown routeName ${routeName}`)
    }
  }

  destroy(): void {
    // GainNode cleanup - will be garbage collected
  }
}
