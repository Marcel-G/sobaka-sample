import { ClockDividerNode } from 'sobaka-dsp'
import type { ModuleDSP, ModuleDSPFactory } from '../types'
import { registerDSPFactory } from '../types'
import { createPlugId, PlugType } from '../../models/links'
import type { NodeContext, ParamContext } from '../../context/plugs'

interface ClockState {
  bpm: number
}

/**
 * DSP implementation for Clock module
 * Manages ClockDividerNode and its parameters
 */
export class ClockDSP implements ModuleDSP {
  private clock: ClockDividerNode
  private bpmParam: AudioParam

  constructor(
    public readonly id: string,
    private audioContext: AudioContext,
    initialState: ClockState
  ) {
    this.clock = new ClockDividerNode(audioContext)
    this.bpmParam = this.clock.node.parameters.get('bpm')!
    
    // Set initial state
    this.updateState(initialState)
  }

  updateState(state: Record<string, unknown>): void {
    const clockState = state as ClockState
    this.bpmParam.setValueAtTime(clockState.bpm, this.audioContext.currentTime)
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

/**
 * Factory function for creating Clock DSP instances
 */
const createClockDSP: ModuleDSPFactory = async (id, audioContext, initialState) => {
  return new ClockDSP(id, audioContext, initialState as ClockState)
}

// Register the factory
registerDSPFactory('Clock', createClockDSP)

export default createClockDSP
