import { AbstractModule } from '.'
import { ModuleType, Input } from '..'
import { SobakaContext } from '../sobaka.node'

export class Clock extends AbstractModule<ModuleType.Clock> {
  static Input = Input
  constructor(context: SobakaContext) {
    super(context, ModuleType.Clock)
  }
}
