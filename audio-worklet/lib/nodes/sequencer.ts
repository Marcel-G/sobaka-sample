import { AbstractStatefulEmitterNode, State } from '.'
import { SobakaContext } from '../sobaka.node'

export class Sequencer extends AbstractStatefulEmitterNode<'Sequencer'> {
  constructor(context: SobakaContext, initial_state: State<'Sequencer'>) {
    super(context, 'Sequencer', initial_state)
  }
}
