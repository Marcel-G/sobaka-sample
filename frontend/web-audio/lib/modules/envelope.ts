import { AbstractModule } from '.'
import { EnvelopeInput, ModuleType } from '..'
import { SobakaContext } from '../sobaka.node'

export class Envelope extends AbstractModule<ModuleType.Envelope> {
  static Input = EnvelopeInput
  constructor(context: SobakaContext) {
    super(context, ModuleType.Envelope)
  }
}
