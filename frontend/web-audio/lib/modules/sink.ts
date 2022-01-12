import { AbstractModule } from '.'
import { SinkEnum as Input, ModuleType } from '..'
import { SobakaContext } from '../sobaka.node'

export class Sink extends AbstractModule<ModuleType.Sink> {
  static Input = Input
  constructor(context: SobakaContext) {
    super(context, ModuleType.Sink)
  }
}
