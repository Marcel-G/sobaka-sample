import { AbstractNode } from '.'
import { SobakaContext } from '../sobaka.node'

export class Sink extends AbstractNode<'Sink'> {
  constructor(context: SobakaContext) {
    super(context, 'Sink', undefined)
  }
}
