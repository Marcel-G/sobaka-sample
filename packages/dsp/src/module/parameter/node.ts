import * as Y from 'yjs';
import { getYjsValue } from "@syncedstore/core";
import { ModuleDSP, Route, RouteInfo } from '../../shared/types'
import { safeSetValueAtTime } from '../../shared/audioUtils'
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
  private parameter?: ConstantSourceNode
  public state: ParameterState
  private cleanupHandler: (() => void) | null = null

  constructor(
    public readonly id: string,
    private audioContext: AudioContext,
    initialState: ParameterState = INITIAL_STATE,
    skipInit: boolean = false
  ) {
    this.state = initialState
    
    if (!skipInit) {
      this.parameter = new ConstantSourceNode(audioContext)
      this.parameter.start()
      
      // Set initial value with safe setter
      safeSetValueAtTime(
        this.parameter.offset,
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
    if (!this.parameter) return
    
    if (event.keysChanged.has('value')) {
      const value = event.target.get('value');
      // Use safe setter to prevent NaN from breaking audio
      safeSetValueAtTime(this.parameter.offset, value, this.audioContext.currentTime, INITIAL_STATE.value)
    }
  }

  getRoutingDefinition() {
    return {
      output: { name: "output", type: PlugType.Output, label: 'Out' },
    } satisfies Record<string, RouteInfo>
  }

  getRoute(routeName: string): Route {
    if (!this.parameter) {
      return { node: new GainNode(new AudioContext()) }
    }
    
    switch (routeName) {
      case "output":
        return { node: this.parameter, connectIndex: 0 }
      default:
        throw new Error(`Unknown routeName ${routeName}`)
    }
  }

  destroy(): void {
    this.cleanupHandler?.()
    if (this.parameter) {
      try {
        this.parameter.stop()
      } catch {
        // May already be stopped
      }
    }
  }
}
