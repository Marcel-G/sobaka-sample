import { AbstractNode } from '.'
import { EnvelopeInput, NodeType } from '..'
import { SobakaContext } from '../sobaka.node'

export class Envelope extends AbstractNode<NodeType.Envelope> {
  static Input = EnvelopeInput
  constructor(context: SobakaContext) {
    super(context, NodeType.Envelope)
  }
}
