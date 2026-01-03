import * as Y from 'yjs';
import { getYjsValue } from "@syncedstore/core";
import { ScopeNode as _ScopeNode } from '@sobaka/dsp/wasm'
import { ModuleDSP, Route, RouteInfo } from '../../shared/types'
import { PlugType } from '@sobaka/state'

export type ScopeMode = 'waveform' | 'spectrum';

export interface ScopeState {
  mode: ScopeMode
  threshold: number
  zoom: number  // Zoom factor: 1.0 = baseline, higher = more zoomed in
}

const INITIAL_STATE: ScopeState = {
  mode: 'waveform',
  threshold: 0.0,
  zoom: 1.0  // 1x zoom as default
}

/**
 * DSP implementation for Scope module
 * Multi-channel waveform display and spectrum analyzer
 */
export class ScopeNode implements ModuleDSP {
  static initialState = INITIAL_STATE
  public name = "scope"
  private scope?: _ScopeNode
  private thresholdParam?: AudioParam
  private zoomParam?: AudioParam
  public state: ScopeState
  private cleanupHandler: (() => void) | null = null

  constructor(
    public readonly id: string,
    private audioContext: AudioContext,
    initialState: ScopeState = INITIAL_STATE,
    skipInit: boolean = false
  ) {
    this.state = initialState
    
    if (!skipInit) {
      this.scope = new _ScopeNode(audioContext)
      this.thresholdParam = this.scope.node.parameters.get('threshold')!
      this.zoomParam = this.scope.node.parameters.get('timeScale')!
      
      this.thresholdParam.setValueAtTime(this.state.threshold, this.audioContext.currentTime)
      this.zoomParam.setValueAtTime(this.state.zoom, this.audioContext.currentTime)

      const state = getYjsValue(this.state);
      if (state instanceof Y.Map) {
        const handler = this.handleStateChange.bind(this)
        state.observe(handler)
        this.cleanupHandler = () => { state.unobserve(handler) }
      }
    }
  }

  handleStateChange(event: Y.YMapEvent<any>) {
    if (!this.scope) return
    
    if (event.keysChanged.has('threshold')) {
      const value = event.target.get('threshold');
      this.thresholdParam!.setValueAtTime(value, this.audioContext.currentTime)
    }
    
    if (event.keysChanged.has('zoom')) {
      const value = event.target.get('zoom');
      this.zoomParam!.setValueAtTime(value, this.audioContext.currentTime)
    }
  }

  getRoutingDefinition() {
    return {
      input_0: { name: "input_0", type: PlugType.Input, label: 'Ch 1' },
      input_1: { name: "input_1", type: PlugType.Input, label: 'Ch 2' },
      input_2: { name: "input_2", type: PlugType.Input, label: 'Ch 3' },
      input_3: { name: "input_3", type: PlugType.Input, label: 'Ch 4' },
    } satisfies Record<string, RouteInfo>
  }

  getRoute(routeName: string): Route {
    if (!this.scope) {
      return { node: new GainNode(new AudioContext()) }
    }
    
    switch (routeName) {
      case "input_0":
        return { node: this.scope.node, connectIndex: 0 }
      case "input_1":
        return { node: this.scope.node, connectIndex: 1 }
      case "input_2":
        return { node: this.scope.node, connectIndex: 2 }
      case "input_3":
        return { node: this.scope.node, connectIndex: 3 }
      default:
        throw new Error(`Unknown routeName ${routeName}`)
    }
  }

  /**
   * Get waveform data for a specific channel
   */
  getWaveformData(channel: number): Float32Array {
    if (!this.scope) return new Float32Array(0)
    return new Float32Array(this.scope.getWaveformData(channel))
  }

  /**
   * Get spectrum data
   */
  getSpectrumData(): Float32Array {
    if (!this.scope) return new Float32Array(0)
    return new Float32Array(this.scope.getSpectrumData())
  }

  /**
   * Get the buffer size
   */
  getBufferSize(): number {
    return this.scope?.getBufferSize() ?? 512
  }

  /**
   * Get the FFT size
   */
  getFftSize(): number {
    return this.scope?.getFftSize() ?? 256
  }

  destroy(): void {
    this.cleanupHandler?.()
    this.scope?.free()
  }
}
