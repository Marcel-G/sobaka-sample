import { AbstractNode } from '.'
import { SobakaContext } from '../sobaka.node'

export class Input extends AbstractNode<'Input'> {
  constructor(context: SobakaContext) {
    super(context, 'Input', undefined)
  }
}
