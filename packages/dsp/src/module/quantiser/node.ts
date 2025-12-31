import * as Y from 'yjs';
import { getYjsValue } from "@syncedstore/core";
import { QuantiserNode as _QuantiserNode } from '@sobaka/dsp/wasm'
import { ModuleDSP, Route, RouteInfo } from '../../shared/types'
import { PlugType } from '@sobaka/state'

export interface QuantiserState {
  notes: boolean[]
}

const INITIAL_STATE: QuantiserState = {
  notes: Array(12).fill(false)
}

/**
 * DSP implementation for Quantiser module
 * Quantizes pitch CV to selected notes in chromatic scale
 */
export class QuantiserNode implements ModuleDSP {
  static initialState = INITIAL_STATE
  public name = "quantiser"
  private quantiser?: _QuantiserNode
  public state: QuantiserState
  private cleanupHandler: (() => void) | null = null

  constructor(
    public readonly id: string,
    audioContext: AudioContext,
    initialState: QuantiserState = INITIAL_STATE,
    skipInit: boolean = false
  ) {
    this.state = initialState
    
    if (!skipInit) {
      this.quantiser = new _QuantiserNode(audioContext)
      // Set initial notes
      this.quantiser.updateNotes(this.state.notes)

      const state = getYjsValue(this.state);
      if (state instanceof Y.Map) {
        const handler = this.handleStateChange.bind(this)
        state.observe(handler)
        this.cleanupHandler = () => { state.unobserve(handler) }
      }
    }
  }

  handleStateChange(event: Y.YMapEvent<any>) {
    if (!this.quantiser) return
    
    if (event.keysChanged.has('notes')) {
      const notes = event.target.get('notes');
      this.quantiser.updateNotes(notes)
    }
  }

  getRoutingDefinition() {
    return {
      input: { name: "input", type: PlugType.Input, label: 'Signal' },
      output: { name: "output", type: PlugType.Output, label: 'Quantised' },
    } satisfies Record<string, RouteInfo>
  }

  getRoute(routeName: string): Route {
    if (!this.quantiser) {
      return { node: new GainNode(new AudioContext()) }
    }
    
    switch (routeName) {
      case "input":
        return { node: this.quantiser.node, connectIndex: 0 }
      case "output":
        return { node: this.quantiser.node, connectIndex: 0 }
      default:
        throw new Error(`Unknown routeName ${routeName}`)
    }
  }

  destroy(): void {
    this.cleanupHandler?.()
    this.quantiser?.free()
  }
}
