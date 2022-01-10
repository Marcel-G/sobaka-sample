import { AbstractModule } from '.'
import { ModuleType, DelayInput as Input } from '..'
import { SobakaContext } from '../sobaka.node'

export class Delay extends AbstractModule<ModuleType.Delay> {
  static Input = Input
  constructor(context: SobakaContext) {
    super(context, ModuleType.Delay)
  }
}
