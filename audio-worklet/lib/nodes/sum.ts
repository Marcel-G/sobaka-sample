import { AbstractNode } from '.'
import { SobakaContext } from '../sobaka.node'

export class Sum extends AbstractNode<'Sum'> {
  constructor(context: SobakaContext) {
    super(context, 'Sum', undefined)
  }
}
