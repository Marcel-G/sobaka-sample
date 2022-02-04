import { AbstractStatefulNode, State } from '.'
import { NodeType, ParameterInput as Input } from '..'
import { SobakaContext } from '../sobaka.node'

export class Parameter extends AbstractStatefulNode<NodeType.Parameter> {
  static Input = Input
  constructor(context: SobakaContext, initial_state: State<NodeType.Parameter>) {
    super(context, NodeType.Parameter, initial_state)
  }
}
