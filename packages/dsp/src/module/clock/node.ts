import { ClockDividerNode as _ClockDividerNode } from '@sobaka/dsp/wasm'
import { ModuleDSP, ModuleRouting } from '../../shared/types'

export interface ClockState {
  bpm: number
}

const INITIAL_STATE: ClockState = { bpm: 120 }

/**
 * DSP implementation for Clock module
 * Manages ClockDividerNode and its parameters
 */
export class ClockNode implements ModuleDSP {
  private clock: _ClockDividerNode
  private bpmParam: AudioParam

  constructor(
    public readonly id: string,
    private audioContext: AudioContext,
    initialState: ClockState = INITIAL_STATE
  ) {
    this.clock = new _ClockDividerNode(audioContext)
    this.bpmParam = this.clock.node.parameters.get('bpm')!
  }

  get node(): AudioNode {
    return this.clock.node
  }

  getRouting(): ModuleRouting {
    return {
      params: [
        { index: 0, label: 'BPM CV', param: this.bpmParam }
      ],
      outputs: [
        { index: 0, label: '1/1', node: this.clock.node, connectIndex: 0 },
        { index: 1, label: '1/2', node: this.clock.node, connectIndex: 1 },
        { index: 2, label: '1/4', node: this.clock.node, connectIndex: 2 },
        { index: 3, label: '1/8', node: this.clock.node, connectIndex: 3 },
        { index: 4, label: '1/16', node: this.clock.node, connectIndex: 4 }
      ]
    }
  }

  destroy(): void {
    // ClockDividerNode cleanup if needed
    // The node will be garbage collected when no longer referenced
  }
}
