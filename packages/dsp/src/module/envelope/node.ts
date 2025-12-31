import * as Y from 'yjs';
import { getYjsValue } from "@syncedstore/core";
import { EnvelopeNode as _EnvelopeNode } from '@sobaka/dsp/wasm'
import { ModuleDSP, Route, RouteInfo } from '../../shared/types'
import { PlugType } from '@sobaka/state'

export interface EnvelopeState {
  attack: number
  release: number
}

const INITIAL_STATE: EnvelopeState = {
  attack: 0.1,
  release: 0.1
}

/**
 * DSP implementation for Envelope module
 * Attack-Release envelope follower
 */
export class EnvelopeNode implements ModuleDSP {
  static initialState = INITIAL_STATE
  public name = "envelope"
  private envelope?: _EnvelopeNode
  private attackParam?: AudioParam
  private releaseParam?: AudioParam
  public state: EnvelopeState
  private cleanupHandler: (() => void) | null = null

  constructor(
    public readonly id: string,
    private audioContext: AudioContext,
    initialState: EnvelopeState = INITIAL_STATE,
    skipInit: boolean = false
  ) {
    this.state = initialState
    
    if (!skipInit) {
      this.envelope = new _EnvelopeNode(audioContext)
      this.attackParam = this.envelope.node.parameters.get('attack')!
      this.releaseParam = this.envelope.node.parameters.get('release')!
      
      this.attackParam.setValueAtTime(this.state.attack, audioContext.currentTime)
      this.releaseParam.setValueAtTime(this.state.release, audioContext.currentTime)

      const state = getYjsValue(this.state);
      if (state instanceof Y.Map) {
        const handler = this.handleStateChange.bind(this)
        state.observe(handler)
        this.cleanupHandler = () => { state.unobserve(handler) }
      }
    }
  }

  handleStateChange(event: Y.YMapEvent<any>) {
    if (!this.envelope) return
    
    if (event.keysChanged.has('attack')) {
      const value = event.target.get('attack');
      this.attackParam!.setValueAtTime(value, this.audioContext.currentTime)
    }
    if (event.keysChanged.has('release')) {
      const value = event.target.get('release');
      this.releaseParam!.setValueAtTime(value, this.audioContext.currentTime)
    }
  }

  getRoutingDefinition() {
    return {
      input: { name: "input", type: PlugType.Input, label: 'Gate' },
      output: { name: "output", type: PlugType.Output, label: 'Envelope' },
    } satisfies Record<string, RouteInfo>
  }

  getRoute(routeName: string): Route {
    if (!this.envelope) {
      return { node: new GainNode(new AudioContext()) }
    }
    
    switch (routeName) {
      case "input":
        return { node: this.envelope.node, connectIndex: 0 }
      case "output":
        return { node: this.envelope.node, connectIndex: 0 }
      default:
        throw new Error(`Unknown routeName ${routeName}`)
    }
  }

  destroy(): void {
    this.cleanupHandler?.()
    this.envelope?.free()
  }
}
