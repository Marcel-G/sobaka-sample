import type { SampleAndHold } from 'sobaka-dsp'
import type { ModuleDSP, ModuleDSPFactory } from '../types'
import { registerDSPFactory } from '../types'
import { createPlugId, PlugType } from '../../models/links'
import type { NodeContext, ParamContext } from '../../context/plugs'

/**
 * DSP implementation for Sample & Hold module
 * Manages SampleAndHold WASM node (no parameters)
 */
export class SampleAndHoldDSP implements ModuleDSP {
  private sampleAndHold: SampleAndHold
  private node: AudioNode

  constructor(
    public readonly id: string,
    private audioContext: AudioContext,
    initialState: Record<string, never>,
    sampleAndHold: SampleAndHold
  ) {
    this.sampleAndHold = sampleAndHold
    this.node = sampleAndHold.node()
  }

  updateState(_state: Record<string, unknown>): void {
    // Sample & Hold has no state to update
  }

  getPlugContexts(): Record<string, ParamContext | NodeContext> {
    return {
      // Signal input
      [createPlugId(this.id, PlugType.Input, 0)]: {
        type: PlugType.Input,
        module: this.node,
        connectIndex: 0
      },
      // Gate input
      [createPlugId(this.id, PlugType.Input, 1)]: {
        type: PlugType.Input,
        module: this.node,
        connectIndex: 1
      },
      // Output
      [createPlugId(this.id, PlugType.Output, 0)]: {
        type: PlugType.Output,
        module: this.node,
        connectIndex: 0
      }
    }
  }

  destroy(): void {
    this.sampleAndHold?.destroy()
    this.sampleAndHold?.free()
  }
}

/**
 * Factory function for creating Sample & Hold DSP instances
 */
const createSampleAndHoldDSP: ModuleDSPFactory = async (
  id,
  audioContext,
  initialState
) => {
  const { SampleAndHold } = await import('sobaka-dsp')
  const sampleAndHold = await SampleAndHold.create(audioContext)
  
  return new SampleAndHoldDSP(
    id,
    audioContext,
    initialState as Record<string, never>,
    sampleAndHold
  )
}

// Register the factory
registerDSPFactory('SampleAndHold', createSampleAndHoldDSP)

export default createSampleAndHoldDSP
