import * as Y from 'yjs';
import { ModuleDSP, Route, RouteInfo } from '../../shared/types'
import { safeSetValueAtTime } from '../../shared/audioUtils'
import { getYjsValue } from "@syncedstore/core";
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
  static initialState = INITIAL_STATE
  public name = "vca"
  private vca?: GainNode
  public state: VcaState
  private cleanupHandler: (() => void) | null = null

  constructor(
    public readonly id: string,
    private audioContext: AudioContext,
    initialState: VcaState = INITIAL_STATE,
    skipInit: boolean = false
  ) {
    this.state = initialState
    
    if (!skipInit) {
      this.vca = new GainNode(audioContext)
      // Use safe setter with default value
      safeSetValueAtTime(
        this.vca.gain,
        this.state.value,
        audioContext.currentTime,
        INITIAL_STATE.value
      )

      const state = getYjsValue(this.state);
      if (state instanceof Y.Map) {
        const handler = this.handleStateChange.bind(this)
        state.observe(handler)
        this.cleanupHandler = () => { state.unobserve(handler) }
      }
    }
  }

  handleStateChange(event: Y.YMapEvent<any>) {
    if (!this.vca) return
    
    if (event.keysChanged.has('value')) {
      const value = event.target.get('value');
      // Use safe setter to prevent NaN from breaking audio
      safeSetValueAtTime(this.vca.gain, value, this.audioContext.currentTime, INITIAL_STATE.value)
    }
  }

  getRoutingDefinition() {
    return {
      input: { name: "input", type: PlugType.Input, label: 'Signal' },
      cv: { name: "cv", type: PlugType.Param, label: 'CV' },
      output: { name: "output", type: PlugType.Output, label: 'Out' },
    } satisfies Record<string, RouteInfo>
  }

  getRoute(routeName: string): Route {
    if (!this.vca) {
      return { node: new GainNode(new AudioContext()) }
    }
    
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
    this.cleanupHandler?.()
  }
}
