import { AbstractStatefulNode, State } from '.'
import { NodeType, FilterInput as Input, FilterKind } from '..'
import { SobakaContext } from '../sobaka.node'

export class Filter extends AbstractStatefulNode<NodeType.Filter> {
  static Input = Input
  static Kind = FilterKind
  constructor(context: SobakaContext, initial_state: State<NodeType.Filter>) {
    super(context, NodeType.Filter, initial_state)
  }
}
