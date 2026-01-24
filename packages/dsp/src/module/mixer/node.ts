import { ModuleDSP, Route, RouteInfo } from '../../shared/types'
import { safeSetValueAtTime, safeSetTargetAtTime, sanitizeValue, DEFAULT_FADE_DURATION } from '../../shared/audioUtils'
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
  private targetVolume: number

  constructor(
    public readonly id: string,
    private audioContext: AudioContext,
    initialState: MixerState = INITIAL_STATE,
    skipInit: boolean = false
  ) {
    this.state = initialState
    this.targetVolume = initialState.muted ? 0 : sanitizeValue(initialState.volume, INITIAL_STATE.volume)
    
    if (!skipInit) {
      this.mixer = new GainNode(audioContext)
      this.volumeParam = this.mixer.gain
      
      // Connect to audio destination (speakers)
      this.mixer.connect(audioContext.destination)
      
      // Set initial volume with safe setter
      safeSetValueAtTime(this.volumeParam, this.targetVolume, audioContext.currentTime, INITIAL_STATE.volume)
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
    
    this.targetVolume = state.muted ? 0 : sanitizeValue(state.volume, INITIAL_STATE.volume)
    
    // Smooth volume changes to avoid clicks, using safe setter
    safeSetTargetAtTime(
      this.volumeParam,
      this.targetVolume,
      this.audioContext.currentTime,
      0.01,
      INITIAL_STATE.volume
    )
  }

  async fadeIn(): Promise<void> {
    if (!this.volumeParam) return
    
    const now = this.audioContext.currentTime
    this.volumeParam.cancelScheduledValues(now)
    this.volumeParam.setValueAtTime(0, now)
    this.volumeParam.linearRampToValueAtTime(this.targetVolume, now + DEFAULT_FADE_DURATION)
    
    await new Promise(resolve => setTimeout(resolve, DEFAULT_FADE_DURATION * 1000))
  }

  async fadeOut(): Promise<void> {
    if (!this.volumeParam) return
    
    const now = this.audioContext.currentTime
    this.volumeParam.cancelScheduledValues(now)
    this.volumeParam.setValueAtTime(this.volumeParam.value, now)
    this.volumeParam.linearRampToValueAtTime(0, now + DEFAULT_FADE_DURATION)
    
    await new Promise(resolve => setTimeout(resolve, DEFAULT_FADE_DURATION * 1000))
  }

  destroy(): void {
    if (this.mixer) {
      this.mixer.disconnect()
    }
  }
}
