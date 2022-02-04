import { AbstractNode } from '.'
import { NodeType, SampleAndHoldInput as Input } from '..'
import { SobakaContext } from '../sobaka.node'

export class SampleAndHold extends AbstractNode<NodeType.SampleAndHold> {
  static Input = Input
  constructor(context: SobakaContext) {
    super(context, NodeType.SampleAndHold)
  }
}
