import { AbstractStatefulModule, State } from '.'
import { Input, ModuleType, OscillatorWave } from '..'
import { SobakaContext } from '../sobaka.node'

export class Oscillator extends AbstractStatefulModule<ModuleType.Oscillator> {
  static Input = Input
  static Wave = OscillatorWave
  constructor(context: SobakaContext, initial_state: State<ModuleType.Oscillator>) {
    super(context, ModuleType.Oscillator, initial_state)
  }
}
