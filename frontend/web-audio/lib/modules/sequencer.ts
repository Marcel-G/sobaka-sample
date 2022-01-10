import { AbstractStatefulModule, State } from '.'
import { ModuleType, SequencerInput } from '..'
import { SobakaContext } from '../sobaka.node'

export class Sequencer extends AbstractStatefulModule<ModuleType.Sequencer> {
  static Input = SequencerInput
  constructor(context: SobakaContext, initial_state: State<ModuleType.Sequencer>) {
    super(context, ModuleType.Sequencer, initial_state)
  }
}
