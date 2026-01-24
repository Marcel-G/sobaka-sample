import { OscillatorNode as _OscillatorNode, OscillatorShape } from '@sobaka/dsp/wasm'
import * as Y from 'yjs';
import { getYjsValue } from "@syncedstore/core";
import { ModuleDSP, Route, RouteInfo } from '../../shared/types'
import { safeSetValueAtTime, isValidNumber, createFadeableOutput } from '../../shared/audioUtils'
import { PlugType } from '@sobaka/state'

export interface OscillatorState {
  pitch: number
  shape: OscillatorShape
}

const INITIAL_STATE: OscillatorState = {
  pitch: 1.0,
  shape: OscillatorShape.Saw
}

/**
 * DSP implementation for Oscillator module
 * Manages OscillatorNode and its parameters
 */
export class OscillatorNode implements ModuleDSP {
  static initialState = INITIAL_STATE
  public name = "oscillator"
  private oscillator?: _OscillatorNode
  private pitchParam?: AudioParam
  public state: OscillatorState
  private cleanupHandler: (() => void) | null = null
  
  // Fadeable output for smooth add/remove
  private outputFade?: {
    gainNode: GainNode
    fadeIn: (duration?: number) => Promise<void>
    fadeOut: (duration?: number) => Promise<void>
  }

  constructor(
    public readonly id: string,
    private audioContext: AudioContext,
    initialState: OscillatorState = INITIAL_STATE,
    skipInit: boolean = false
  ) {
    this.state = initialState
    
    if (!skipInit) {
      this.oscillator = new _OscillatorNode(audioContext, this.state.shape)
      this.pitchParam = this.oscillator.node.parameters.get('pitch')!
      // Use safe setter with default value
      safeSetValueAtTime(this.pitchParam, this.state.pitch, audioContext.currentTime, INITIAL_STATE.pitch)

      // Create fadeable output wrapper (starts muted for fade-in)
      this.outputFade = createFadeableOutput(audioContext, true)
      this.oscillator.node.connect(this.outputFade.gainNode)

      const state = getYjsValue(this.state);
      if (state instanceof Y.Map) {
        const handler = this.handleStateChange.bind(this)
        state.observe(handler)
        this.cleanupHandler = () => { state.unobserve(handler) }
      }
    }
  }

  handleStateChange(event: Y.YMapEvent<any>) {
    if (!this.oscillator) return
    
    if (event.keysChanged.has('shape')) {
      const shape = event.target.get('shape');
      // Validate shape is a valid enum value
      if (Object.values(OscillatorShape).includes(shape)) {
        this.oscillator.setShape(shape)
      }
    }
    if (event.keysChanged.has('pitch')) {
      const value = event.target.get('pitch');
      // Use safe setter to prevent NaN from breaking audio
      safeSetValueAtTime(this.pitchParam, value, this.audioContext.currentTime, INITIAL_STATE.pitch)
    }
  }

  getRoutingDefinition() {
    return {
      pitch: { name: "pitch", type: PlugType.Param, label: 'Pitch CV' },
      output: { name: "output", type: PlugType.Output, label: 'Out' },
    } satisfies Record<string, RouteInfo>
  }

  getRoute(routeName: string): Route {
    if (!this.oscillator || !this.outputFade) {
      return { node: new GainNode(new AudioContext()) }
    }
    
    switch (routeName) {
      case "pitch":
        return { node: this.pitchParam! }
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
    this.cleanupHandler?.()
    this.outputFade?.gainNode.disconnect()
    this.oscillator?.free()
  }
}
