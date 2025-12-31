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

  constructor(
    public readonly id: string,
    audioContext: AudioContext,
    initialState: EnvelopeState = INITIAL_STATE,
    skipInit: boolean = false
  ) {
    this.state = initialState
    
    if (!skipInit) {
      this.envelope = new _EnvelopeNode(audioContext)
      this.attackParam = this.envelope.node.parameters.get('attack')!
      this.releaseParam = this.envelope.node.parameters.get('release')!
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
    this.envelope?.free()
  }
}
