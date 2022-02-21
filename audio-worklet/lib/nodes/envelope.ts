import { AbstractNode } from '.'
import { SobakaContext } from '../sobaka.node'

export class Envelope extends AbstractNode<'Envelope'> {
  constructor(context: SobakaContext) {
    super(context, 'Envelope', undefined)
  }
}
