import { OscillatorNode as _OscillatorNode, OscillatorShape } from '@sobaka/dsp/wasm'
import * as Y from 'yjs';
import { getYjsValue } from "@syncedstore/core";
import { ModuleDSP, Route, RouteInfo } from '../../shared/types'
import { PlugType } from '@sobaka/state'

export interface OscillatorState {
  pitch: number
  shape: OscillatorShape
}

const INITIAL_STATE: OscillatorState = {
  pitch: 1.0,
  shape: OscillatorShape.Saw
}

/**
 * DSP implementation for Oscillator module
 * Manages OscillatorNode and its parameters
 */
export class OscillatorNode implements ModuleDSP {
  static initialState = INITIAL_STATE
  public name = "oscillator"
  private oscillator: _OscillatorNode
  private pitchParam: AudioParam
  public state: OscillatorState
  private cleanupHandler: (() => void) | null = null

  constructor(
    public readonly id: string,
    private audioContext: AudioContext,
    initialState: OscillatorState = INITIAL_STATE
  ) {
    this.state = initialState
    this.oscillator = new _OscillatorNode(audioContext, this.state.shape)
    this.pitchParam = this.oscillator.node.parameters.get('pitch')!
    this.pitchParam.setValueAtTime(this.state.pitch, this.audioContext.currentTime)

    const state = getYjsValue(this.state);
    if (state instanceof Y.Map) {
      const handler = this.handleStateChange.bind(this)
      state.observe(handler)
      this.cleanupHandler = () => { state.unobserve(handler) }
    }

  }

  handleStateChange(event: Y.YMapEvent<any>) {
    if (event.keysChanged.has('shape')) {
      const shape = event.target.get('shape');
      this.oscillator.setShape(shape)
    }
    if (event.keysChanged.has('pitch')) {
      const value = event.target.get('pitch');
      this.pitchParam.setValueAtTime(value, this.audioContext.currentTime)
    }
  }

  getRoutingDefinition() {
    return {
      pitch: { name: "pitch", type: PlugType.Param, label: 'Pitch CV' },
      output: { name: "output", type: PlugType.Output, label: 'Out' },
    } satisfies Record<string, RouteInfo>
  }

  getRoute(routeName: string): Route {
    switch (routeName) {
      case "pitch":
        return { node: this.pitchParam }
      case "output":
        return { node: this.oscillator.node, connectIndex: 0 }
      default:
        throw new Error(`Unknown routeName ${routeName}`)
    }
  }

  destroy(): void {
    this.cleanupHandler?.()
  }
}
