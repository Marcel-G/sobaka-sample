import { AbstractNode } from '.'
import { NodeType } from '..'
import { SobakaContext } from '../sobaka.node'

export class Noise extends AbstractNode<NodeType.Noise> {
  constructor(context: SobakaContext) {
    super(context, NodeType.Noise)
  }
}
