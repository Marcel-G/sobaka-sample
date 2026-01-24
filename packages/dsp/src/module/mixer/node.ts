import { ModuleDSP, Route, RouteInfo } from '../../shared/types'
import { safeSetValueAtTime, safeSetTargetAtTime, sanitizeValue } from '../../shared/audioUtils'
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
  private mixer?: GainNode
  private volumeParam?: AudioParam
  public state: MixerState

  constructor(
    public readonly id: string,
    private audioContext: AudioContext,
    initialState: MixerState = INITIAL_STATE,
    skipInit: boolean = false
  ) {
    this.state = initialState
    
    if (!skipInit) {
      this.mixer = new GainNode(audioContext)
      this.volumeParam = this.mixer.gain
      
      // Connect to audio destination (speakers)
      this.mixer.connect(audioContext.destination)
      
      // Set initial volume with safe setter
      const targetVolume = initialState.muted ? 0 : sanitizeValue(initialState.volume, INITIAL_STATE.volume)
      safeSetValueAtTime(this.volumeParam, targetVolume, audioContext.currentTime, INITIAL_STATE.volume)
    }
  }

  getRoutingDefinition() {
    return {
      input: { name: "input", type: PlugType.Input, label: 'In' },
    } satisfies Record<string, RouteInfo>
  }

  getRoute(routeName: string): Route {
    if (!this.mixer) {
      return { node: new GainNode(new AudioContext()) }
    }
    
    switch (routeName) {
      case "input":
        return { node: this.mixer }
      default:
        throw new Error(`Unknown routeName ${routeName}`)
    }
  }

  updateState(state: MixerState): void {
    this.state = state
    
    if (!this.mixer || !this.volumeParam) return
    
    const targetVolume = state.muted ? 0 : sanitizeValue(state.volume, INITIAL_STATE.volume)
    
    // Smooth volume changes to avoid clicks, using safe setter
    safeSetTargetAtTime(
      this.volumeParam,
      targetVolume,
      this.audioContext.currentTime,
      0.01,
      INITIAL_STATE.volume
    )
  }

  destroy(): void {
    if (this.mixer) {
      this.mixer.disconnect()
    }
  }
}
