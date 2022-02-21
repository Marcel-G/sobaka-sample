import { AbstractStatefulNode, State } from '.'
import { SobakaContext } from '../sobaka.node'

export class Quantiser extends AbstractStatefulNode<'Quantiser'> {
  constructor(context: SobakaContext, initial_state: State<'Quantiser'>) {
    super(context, 'Quantiser', initial_state)
  }
}
