import { AbstractNode } from '.'
import { NodeType, DelayInput as Input } from '..'
import { SobakaContext } from '../sobaka.node'

export class Delay extends AbstractNode<NodeType.Delay> {
  static Input = Input
  constructor(context: SobakaContext) {
    super(context, NodeType.Delay)
  }
}
