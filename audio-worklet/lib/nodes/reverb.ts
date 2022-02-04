import { AbstractNode } from '.'
import { ReverbInput as Input, NodeType } from '..'
import { SobakaContext } from '../sobaka.node'

export class Reverb extends AbstractNode<NodeType.Reverb> {
  static Input = Input
  constructor(context: SobakaContext) {
    super(context, NodeType.Reverb)
  }
}
