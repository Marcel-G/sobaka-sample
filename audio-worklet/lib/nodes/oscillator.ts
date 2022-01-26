import { AbstractStatefulNode, State } from '.'
import { OscillatorInput as Input, NodeType, OscillatorWave } from '..'
import { SobakaContext } from '../sobaka.node'

export class Oscillator extends AbstractStatefulNode<NodeType.Oscillator> {
  static Input = Input
  static Wave = OscillatorWave
  constructor(context: SobakaContext, initial_state: State<NodeType.Oscillator>) {
    super(context, NodeType.Oscillator, initial_state)
  }
}
