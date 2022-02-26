import { AbstractNode } from '.'
import { SobakaContext } from '../sobaka.node'

export class SampleAndHold extends AbstractNode<'SampleAndHold'> {
  constructor(context: SobakaContext) {
    super(context, 'SampleAndHold', undefined)
  }
}