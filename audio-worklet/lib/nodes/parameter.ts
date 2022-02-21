import { AbstractStatefulNode, State } from '.'
import { SobakaContext } from '../sobaka.node'

export class Parameter extends AbstractStatefulNode<'Parameter'> {
  constructor(context: SobakaContext, initial_state: State<'Parameter'>) {
    super(context, 'Parameter', initial_state)
  }
}
