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
  private quantiser: _QuantiserNode
  public state: QuantiserState

  constructor(
    public readonly id: string,
    audioContext: AudioContext,
    initialState: QuantiserState = INITIAL_STATE
  ) {
    this.quantiser = new _QuantiserNode(audioContext)
    this.state = initialState

    // Set initial notes
    this.updateNotes(this.state.notes)
  }

  getRoutingDefinition() {
    return {
      input: { name: "input", type: PlugType.Input, label: 'Signal' },
      output: { name: "output", type: PlugType.Output, label: 'Quantised' },
    } satisfies Record<string, RouteInfo>
  }

  getRoute(routeName: string): Route {
    switch (routeName) {
      case "input":
        return { node: this.quantiser.node, connectIndex: 0 }
      case "output":
        return { node: this.quantiser.node, connectIndex: 0 }
      default:
        throw new Error(`Unknown routeName ${routeName}`)
    }
  }

  updateNotes(notes: boolean[]) {
    this.quantiser.updateNotes(notes)
    this.state.notes = [...notes]
  }

  destroy(): void {
    // QuantiserNode cleanup if needed
  }
}
