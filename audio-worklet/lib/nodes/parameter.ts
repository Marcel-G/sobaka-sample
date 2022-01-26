import { AbstractStatefulNode, State } from '.'
import { NodeType } from '..'
import { SobakaContext } from '../sobaka.node'

export class Parameter extends AbstractStatefulNode<NodeType.Parameter> {
  constructor(context: SobakaContext, initial_state: State<NodeType.Parameter>) {
    super(context, NodeType.Parameter, initial_state)
  }
}
