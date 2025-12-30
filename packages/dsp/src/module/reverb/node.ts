import { ReverbNode as _ReverbNode } from '@sobaka/dsp/wasm'
import * as Y from 'yjs';
import { getYjsValue } from "@syncedstore/core";
import { ModuleDSP, Route, RouteInfo } from '../../shared/types'
import { PlugType } from '@sobaka/state'

export interface ReverbState {
  time: number
  wet: number
}

const INITIAL_STATE: ReverbState = {
  time: 2.0,
  wet: 0.5
}

/**
 * DSP implementation for Reverb module
 * Stereo reverb effect with time (k-rate) and wet (a-rate) controls
 * Room size is fixed at 10.0
 */
export class ReverbNode implements ModuleDSP {
  static initialState = INITIAL_STATE
  public name = "reverb"
  private reverb?: _ReverbNode
  private wetParam?: AudioParam
  public state: ReverbState
  private cleanupHandler: (() => void) | null = null

  constructor(
    public readonly id: string,
    private audioContext: AudioContext,
    initialState: ReverbState = INITIAL_STATE,
    skipInit: boolean = false
  ) {
    this.state = initialState
    
    if (!skipInit) {
      this.reverb = new _ReverbNode(
        audioContext,
        this.state.time
      )
      this.wetParam = this.reverb.node.parameters.get('wet')!
      this.wetParam.setValueAtTime(this.state.wet, audioContext.currentTime)

      const state = getYjsValue(this.state);
      if (state instanceof Y.Map) {
        const handler = this.handleStateChange.bind(this)
        state.observe(handler)
        this.cleanupHandler = () => { state.unobserve(handler) }
      }
    }
  }

  handleStateChange(event: Y.YMapEvent<any>) {
    if (!this.reverb) return
    
    if (event.keysChanged.has('time')) {
      const time = event.target.get('time');
      this.reverb.setTime(time)
    }
    
    if (event.keysChanged.has('wet')) {
      const value = event.target.get('wet');
      this.wetParam!.setValueAtTime(value, this.audioContext.currentTime)
    }
  }

  getRoutingDefinition() {
    return {
      input: { name: "input", type: PlugType.Input, label: 'In' },
      wet: { name: "wet", type: PlugType.Param, label: 'Wet CV' },
      output: { name: "output", type: PlugType.Output, label: 'Out' },
    } satisfies Record<string, RouteInfo>
  }

  getRoute(routeName: string): Route {
    if (!this.reverb) {
      return { node: new GainNode(new AudioContext()) }
    }
    
    switch (routeName) {
      case "input":
        return { node: this.reverb.node, connectIndex: 0 }
      case "wet":
        return { node: this.wetParam! }
      case "output":
        return { node: this.reverb.node, connectIndex: 0 }
      default:
        throw new Error(`Unknown routeName ${routeName}`)
    }
  }

  destroy(): void {
    this.cleanupHandler?.()
  }
}
