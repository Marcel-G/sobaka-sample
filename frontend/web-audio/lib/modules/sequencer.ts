import { AbstractStatefulModule } from '.'
import { ModuleType, SequencerState } from '..'
import { SamplerNode } from '../sampler.node'

export class Sequencer extends AbstractStatefulModule<
  ModuleType.Sequencer,
  SequencerState
> {
  constructor(context: SamplerNode) {
    super(context, ModuleType.Sequencer)
  }
}
