import { AbstractNode } from '.'
import { NodeType, Input } from '..'
import { SobakaContext } from '../sobaka.node'

export class Sink extends AbstractNode<NodeType.Sink> {
  static Input = Input
  constructor(context: SobakaContext) {
    super(context, NodeType.Sink)
  }
}
