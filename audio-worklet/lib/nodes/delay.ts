import { AbstractNode } from '.'
import { SobakaContext } from '../sobaka.node'

export class Delay extends AbstractNode<'Delay'> {
  constructor(context: SobakaContext) {
    super(context, 'Delay', undefined)
  }
}
