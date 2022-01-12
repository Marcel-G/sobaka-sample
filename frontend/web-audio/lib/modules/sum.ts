import { AbstractModule } from '.'
import { ModuleType, SinkEnum as Input } from '..'
import { SobakaContext } from '../sobaka.node'

export class Sum extends AbstractModule<ModuleType.Sum> {
  static Input = Input
  constructor(context: SobakaContext) {
    super(context, ModuleType.Sum)
  }
}

