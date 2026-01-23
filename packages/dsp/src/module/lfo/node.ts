import { LfoNode as _LfoNode } from '@sobaka/dsp/wasm'
import * as Y from 'yjs';
import { getYjsValue } from "@syncedstore/core";
import { ModuleDSP, Route, RouteInfo } from '../../shared/types'
import { PlugType } from '@sobaka/state'

export interface LfoState {
  rate: number
}

const INITIAL_STATE: LfoState = {
  rate: 1.0
}

/**
 * DSP implementation for LFO (Low Frequency Oscillator) module
 * Outputs a sine wave for modulation purposes
 * Supports reset input to sync phase to external clock/gate
 */
export class LfoNode implements ModuleDSP {
  static initialState = INITIAL_STATE
  public name = "lfo"
  private lfo?: _LfoNode
  private rateParam?: AudioParam
  public state: LfoState
  private cleanupHandler: (() => void) | null = null

  constructor(
    public readonly id: string,
    private audioContext: AudioContext,
    initialState: LfoState = INITIAL_STATE,
    skipInit: boolean = false
  ) {
    this.state = initialState

    if (!skipInit) {
      this.lfo = new _LfoNode(audioContext)
      this.rateParam = this.lfo.node.parameters.get('rate')!
      this.rateParam.setValueAtTime(this.state.rate, audioContext.currentTime)

      const state = getYjsValue(this.state);
      if (state instanceof Y.Map) {
        const handler = this.handleStateChange.bind(this)
        state.observe(handler)
        this.cleanupHandler = () => { state.unobserve(handler) }
      }
    }
  }

  handleStateChange(event: Y.YMapEvent<any>) {
    if (!this.lfo) return

    if (event.keysChanged.has('rate')) {
      const value = event.target.get('rate');
      this.rateParam!.setValueAtTime(value, this.audioContext.currentTime)
    }
  }

  getRoutingDefinition() {
    return {
      rate: { name: "rate", type: PlugType.Param, label: 'Rate CV' },
      reset: { name: "reset", type: PlugType.Input, label: 'Reset' },
      output: { name: "output", type: PlugType.Output, label: 'Out' },
    } satisfies Record<string, RouteInfo>
  }

  getRoute(routeName: string): Route {
    if (!this.lfo) {
      return { node: new GainNode(new AudioContext()) }
    }

    switch (routeName) {
      case "rate":
        return { node: this.rateParam! }
      case "reset":
        return { node: this.lfo.node, connectIndex: 0 }
      case "output":
        return { node: this.lfo.node, connectIndex: 0 }
      default:
        throw new Error(`Unknown routeName ${routeName}`)
    }
  }

  destroy(): void {
    this.cleanupHandler?.()
    this.lfo?.free()
  }
}
