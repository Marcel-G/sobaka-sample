import { AbstractModule } from '.'
import { SinkInput, ModuleType } from '..'
import { SobakaContext } from '../sobaka.node'

export class Sink extends AbstractModule<ModuleType.Sink> {
  static Input = SinkInput
  constructor(context: SobakaContext) {
    super(context, ModuleType.Sink)
  }
}
