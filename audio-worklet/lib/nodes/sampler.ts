import { AbstractStatefulEmitterNode, State } from '.'
import { SobakaContext } from '../sobaka.node'

export class Sampler extends AbstractStatefulEmitterNode<'Sampler'> {
  constructor(context: SobakaContext, initial_state: State<'Sampler'>) {
    super(context, 'Sampler', initial_state)
  }
}
