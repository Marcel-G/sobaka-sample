import * as Y from 'yjs';
import { getYjsValue } from "@syncedstore/core";
import { EnvelopeNode as _EnvelopeNode, EnvelopeState as _EnvelopeState, GateEvent } from '@sobaka/dsp/wasm'
import { ModuleDSP, Route, RouteInfo } from '../../shared/types'
import { PlugType } from '@sobaka/state'

export interface EnvelopeState {
    attack: number
    decay: number
    sustain: number
    release: number 
}

const INITIAL_STATE: EnvelopeState = {
    attack: 0.1,
    decay: 0.1,
    sustain: 0.7,
    release: 0.1 
}

export interface GateEventData {
  type: GateEvent
}

/**
 * DSP implementation for Envelope module
 * ADSR envelope with live gate input
 */
export class EnvelopeNode implements ModuleDSP {
  static initialState = INITIAL_STATE
  public name = "envelope"
  private envelope?: _EnvelopeNode
  public state: EnvelopeState
  private cleanupHandler: (() => void) | null = null
  private gateListeners: Set<(event: GateEventData) => void> = new Set()
  private pollingInterval?: number

  constructor(
    public readonly id: string,
    audioContext: AudioContext,
    initialState: EnvelopeState = INITIAL_STATE,
    skipInit: boolean = false
  ) {
    this.state = initialState
    
    if (!skipInit) {
      const { attack, decay, sustain, release } = this.state;
      this.envelope = new _EnvelopeNode(
        audioContext,
        new _EnvelopeState(attack, decay, sustain, release)
      )

      const state = getYjsValue(this.state);
      if (state instanceof Y.Map) {
        const handler = this.handleStateChange.bind(this)
        state.observe(handler)
        this.cleanupHandler = () => { state.unobserve(handler) }
      }

      // Start polling for gate events
      this.startEventPolling()
    }
  }

  private startEventPolling() {
    const poll = () => {
      if (!this.envelope) return
      
      let latestEvent: GateEvent | undefined
      let event: GateEvent | undefined
      while ((event = this.envelope.pollEvent())) {
        latestEvent = event
      }
      
      if (latestEvent !== undefined) {
        const eventData: GateEventData = { type: latestEvent }
        this.gateListeners.forEach(listener => listener(eventData))
      }
      
      this.pollingInterval = requestAnimationFrame(poll)
    }
    
    this.pollingInterval = requestAnimationFrame(poll)
  }

  public addGateListener(listener: (event: GateEventData) => void) {
    this.gateListeners.add(listener)
  }

  public removeGateListener(listener: (event: GateEventData) => void) {
    this.gateListeners.delete(listener)
  }

  handleStateChange(event: Y.YMapEvent<any>) {
    if (!this.envelope) return
    
    if (
      event.keysChanged.has('attack') ||
      event.keysChanged.has('decay') ||
      event.keysChanged.has('sustain') ||
      event.keysChanged.has('release')
    ) {
      const state = new _EnvelopeState(
        event.target.get('attack'),
        event.target.get('decay'),
        event.target.get('sustain'),
        event.target.get('release'),
      )
      this.envelope.updateState(state)
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
    if (this.pollingInterval !== undefined) {
      cancelAnimationFrame(this.pollingInterval)
    }
    this.gateListeners.clear()
    this.cleanupHandler?.()
    this.envelope?.free()
  }
}
