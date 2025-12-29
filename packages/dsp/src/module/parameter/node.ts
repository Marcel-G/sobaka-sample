import { ModuleDSP, Route, RouteInfo } from '../../shared/types'
import { PlugType } from '@sobaka/state'

export interface ParameterState {
  value: number
}

const INITIAL_STATE: ParameterState = {
  value: 0.5
}

/**
 * DSP implementation for Parameter module
 * Uses native Web Audio ConstantSourceNode for CV generation
 */
export class ParameterNode implements ModuleDSP {
  static initialState = INITIAL_STATE
  public name = "parameter"
  private parameter: ConstantSourceNode
  public state: ParameterState

  constructor(
    public readonly id: string,
    audioContext: AudioContext,
    initialState: ParameterState = INITIAL_STATE
  ) {
    this.parameter = new ConstantSourceNode(audioContext)
    this.parameter.start()
    this.state = initialState
    
    // Set initial value
    this.parameter.offset.setValueAtTime(
      this.state.value ?? INITIAL_STATE.value,
      audioContext.currentTime
    )
  }

  getRoutingDefinition() {
    return {
      output: { name: "output", type: PlugType.Output, label: 'Out' },
    } satisfies Record<string, RouteInfo>
  }

  getRoute(routeName: string): Route {
    switch (routeName) {
      case "output":
        return { node: this.parameter, connectIndex: 0 }
      default:
        throw new Error(`Unknown routeName ${routeName}`)
    }
  }

  destroy(): void {
    try {
      this.parameter.stop()
    } catch {
      // May already be stopped
    }
  }
}
