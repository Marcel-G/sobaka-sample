import { AbstractNode } from '.'
import { NodeType, Input } from '..'
import { SobakaContext } from '../sobaka.node'

export class Sum extends AbstractNode<NodeType.Sum> {
  static Input = Input
  constructor(context: SobakaContext) {
    super(context, NodeType.Sum)
  }
}
