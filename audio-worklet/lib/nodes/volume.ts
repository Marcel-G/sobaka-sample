import { AbstractNode } from '.'
import { SobakaContext } from '../sobaka.node'

export class Volume extends AbstractNode<'Volume'> {
  constructor(context: SobakaContext) {
    super(context, 'Volume', undefined)
  }
}
