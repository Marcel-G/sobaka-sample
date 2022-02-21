import { AbstractNode } from '.'
import { SobakaContext } from '../sobaka.node'

export class Reverb extends AbstractNode<'Reverb'> {
  constructor(context: SobakaContext) {
    super(context, 'Reverb', undefined)
  }
}
