import { createPlugId, PlugType } from '@sobaka/state'

import { ClockDividerNode as _ClockDividerNode } from '@sobaka/dsp/wasm'
import { ModuleDSP } from '../../shared/types'
import { NodeContext, ParamContext } from '@sobaka/state/models/plugs'

interface ClockState {
  bpm: number
}

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
    initialState: ClockState
  ) {
    this.clock = new _ClockDividerNode(audioContext)
    this.bpmParam = this.clock.node.parameters.get('bpm')!
    
    // Set initial state
    this.updateState(initialState)
  }

  updateState(state: Record<string, unknown>): void {
    this.bpmParam.setValueAtTime(state.bpm, this.audioContext.currentTime)
  }

  getPlugContexts(): Record<string, ParamContext | NodeContext> {
    const node = this.clock.node
    
    return {
      // BPM CV input (param)
      [createPlugId(this.id, PlugType.Param, 0)]: {
        type: PlugType.Param,
        param: this.bpmParam
      },
      // Clock outputs
      [createPlugId(this.id, PlugType.Output, 0)]: {
        type: PlugType.Output,
        module: node,
        connectIndex: 0
      },
      [createPlugId(this.id, PlugType.Output, 1)]: {
        type: PlugType.Output,
        module: node,
        connectIndex: 1
      },
      [createPlugId(this.id, PlugType.Output, 2)]: {
        type: PlugType.Output,
        module: node,
        connectIndex: 2
      },
      [createPlugId(this.id, PlugType.Output, 3)]: {
        type: PlugType.Output,
        module: node,
        connectIndex: 3
      },
      [createPlugId(this.id, PlugType.Output, 4)]: {
        type: PlugType.Output,
        module: node,
        connectIndex: 4
      }
    }
  }

  destroy(): void {
    // ClockDividerNode cleanup if needed
    // The node will be garbage collected when no longer referenced
  }
}

