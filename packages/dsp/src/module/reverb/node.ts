import { ReverbNode as _ReverbNode } from '@sobaka/dsp/wasm'
import * as Y from 'yjs';
import { getYjsValue } from "@syncedstore/core";
import { ModuleDSP, Route, RouteInfo } from '../../shared/types'
import { PlugType } from '@sobaka/state'

export interface ReverbState {
  roomSize: number
  damping: number
  wet: number
}

const INITIAL_STATE: ReverbState = {
  roomSize: 10.0,
  damping: 2.0,
  wet: 0.5
}

/**
 * DSP implementation for Reverb module
 * Stereo reverb effect with room size, damping, and wet controls
 */
export class ReverbNode implements ModuleDSP {
  static initialState = INITIAL_STATE
  public name = "reverb"
  private reverb?: _ReverbNode
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
        this.state.roomSize,
        this.state.damping,
        this.state.wet
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
    if (!this.reverb) return
    
    // Update reverb parameters when any of them change
    if (event.keysChanged.has('roomSize') || 
        event.keysChanged.has('damping') || 
        event.keysChanged.has('wet')) {
      const roomSize = event.target.get('roomSize');
      const damping = event.target.get('damping');
      const wet = event.target.get('wet');
      this.reverb.setParams(roomSize, damping, wet)
    }
  }

  getRoutingDefinition() {
    return {
      input: { name: "input", type: PlugType.Input, label: 'In' },
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
