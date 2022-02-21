import { AbstractNode } from '.'
import { SobakaContext } from '../sobaka.node'

export class Noise extends AbstractNode<'Noise'> {
  constructor(context: SobakaContext) {
    super(context, 'Noise', undefined)
  }
}
