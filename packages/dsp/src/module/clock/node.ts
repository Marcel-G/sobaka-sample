import { ClockDividerNode as _ClockDividerNode } from '../../../pkg/sobaka_dsp'
import { createPlugId, PlugType } from '@sobaka/state'
import { ModuleDSP, ModuleDSPFactory, register } from '../../shared/types'

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

  updateState(state: ClockState): void {
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

/**
 * Factory function for creating Clock DSP instances
 */
const createClockDSP: ModuleDSPFactory = async (id, audioContext, initialState) => {
  return new ClockNode(id, audioContext, initialState)
}

// Register the factory
register(createClockDSP, 'clock')

export default createClockDSP
