import { AbstractStatefulNode, State } from '.'
import { NodeType, QuantiserInput as Input } from '..'
import { SobakaContext } from '../sobaka.node'

export class Quantiser extends AbstractStatefulNode<NodeType.Quantiser> {
  static Input = Input
  constructor(context: SobakaContext, initial_state: State<NodeType.Quantiser>) {
    super(context, NodeType.Quantiser, initial_state)
  }
}
