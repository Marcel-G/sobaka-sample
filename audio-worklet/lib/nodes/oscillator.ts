import { AbstractStatefulNode, State } from '.'
import { SobakaContext } from '../sobaka.node'

export class Oscillator extends AbstractStatefulNode<'Oscillator'> {
  constructor(context: SobakaContext, initial_state: State<'Oscillator'>) {
    super(context, 'Oscillator', initial_state)
  }
}
