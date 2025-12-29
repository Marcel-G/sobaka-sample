import { ModuleDSP, Route, RouteInfo } from '../../shared/types'
import { PlugType } from '@sobaka/state'

export interface MixerState {
  volume: number
  muted: boolean
}

const INITIAL_STATE: MixerState = { volume: 0.7, muted: false }

/**
 * DSP implementation for Output Mixer module
 * This is the global mixer that connects to audio destination
 * It receives inputs from other modules and outputs to speakers/headphones
 */
export class MixerDSP implements ModuleDSP {
  static initialState = INITIAL_STATE
  private mixer: GainNode
  private volumeParam: AudioParam
  public state: MixerState

  constructor(
    public readonly id: string,
    private audioContext: AudioContext,
    initialState: MixerState = INITIAL_STATE
  ) {
    this.mixer = new GainNode(audioContext)
    this.volumeParam = this.mixer.gain
    this.state = initialState
    
    // Connect to audio destination (speakers)
    this.mixer.connect(audioContext.destination)
    
    // Set initial volume
    const targetVolume = initialState.muted ? 0 : initialState.volume
    this.volumeParam.setValueAtTime(targetVolume, audioContext.currentTime)
  }

  getRoutingDefinition() {
    return {
      input: { name: "input", type: PlugType.Input, label: 'In' },
    } satisfies Record<string, RouteInfo>
  }

  getRoute(routeName: string): Route {
    switch (routeName) {
      case "input":
        return { node: this.mixer }
      default:
        throw new Error(`Unknown routeName ${routeName}`)
    }
  }

  updateState(state: MixerState): void {
    this.state = state
    const targetVolume = state.muted ? 0 : state.volume
    
    // Smooth volume changes to avoid clicks
    this.volumeParam.setTargetAtTime(
      targetVolume,
      this.audioContext.currentTime,
      0.01
    )
  }

  destroy(): void {
    this.mixer.disconnect()
  }
}
