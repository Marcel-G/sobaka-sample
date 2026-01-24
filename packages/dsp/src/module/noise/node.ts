import { NoiseNode as _NoiseNode } from '@sobaka/dsp/wasm'
import { ModuleDSP, Route, RouteInfo } from '../../shared/types'
import { createFadeableOutput } from '../../shared/audioUtils'
import { PlugType } from '@sobaka/state'

export interface NoiseState {
  // Noise module has no state
}

const INITIAL_STATE: NoiseState = {}

/**
 * DSP implementation for Noise module
 * White noise generator with no parameters
 */
export class NoiseNode implements ModuleDSP {
  static initialState = INITIAL_STATE
  public name = "noise"
  private noise?: _NoiseNode
  public state: NoiseState
  
  // Fadeable output for smooth add/remove
  private outputFade?: {
    gainNode: GainNode
    fadeIn: (duration?: number) => Promise<void>
    fadeOut: (duration?: number) => Promise<void>
  }

  constructor(
    public readonly id: string,
    private audioContext: AudioContext,
    initialState: NoiseState = INITIAL_STATE,
    skipInit: boolean = false
  ) {
    this.state = initialState
    
    if (!skipInit) {
      this.noise = new _NoiseNode(audioContext)
      
      // Create fadeable output wrapper (starts muted for fade-in)
      this.outputFade = createFadeableOutput(audioContext, true)
      this.noise.node.connect(this.outputFade.gainNode)
    }
  }

  getRoutingDefinition() {
    return {
      output: { name: "output", type: PlugType.Output, label: 'Noise' },
    } satisfies Record<string, RouteInfo>
  }

  getRoute(routeName: string): Route {
    if (!this.noise || !this.outputFade) {
      return { node: new GainNode(new AudioContext()) }
    }
    
    switch (routeName) {
      case "output":
        // Route through the fadeable output gain node
        return { node: this.outputFade.gainNode, connectIndex: 0 }
      default:
        throw new Error(`Unknown routeName ${routeName}`)
    }
  }

  async fadeIn(): Promise<void> {
    await this.outputFade?.fadeIn()
  }

  async fadeOut(): Promise<void> {
    await this.outputFade?.fadeOut()
  }

  destroy(): void {
    this.outputFade?.gainNode.disconnect()
    this.noise?.free()
  }
}
