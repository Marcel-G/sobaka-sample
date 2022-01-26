import { AbstractStatefulEmitterNode, State } from '.'
import { NodeType, SequencerInput } from '..'
import { SobakaContext } from '../sobaka.node'

export class Sequencer extends AbstractStatefulEmitterNode<NodeType.Sequencer> {
  static Input = SequencerInput
  constructor(context: SobakaContext, initial_state: State<NodeType.Sequencer>) {
    super(context, NodeType.Sequencer, initial_state)
  }
}
