import { AbstractNode } from '.'
import { NodeType, VolumeInput } from '..'
import { SobakaContext } from '../sobaka.node'

export class Volume extends AbstractNode<NodeType.Volume> {
  static Input = VolumeInput
  constructor(context: SobakaContext) {
    super(context, NodeType.Volume)
  }
}
