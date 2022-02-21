import { AbstractStatefulNode, State } from '.'
import { SobakaContext } from '../sobaka.node'

export class Filter extends AbstractStatefulNode<'Filter'> {
  constructor(context: SobakaContext, initial_state: State<'Filter'>) {
    super(context, 'Filter', initial_state)
  }
}
