import { AbstractModule } from '.'
import { ModuleType } from '..'
import { SamplerNode } from '../sampler.node'

export class Envelope extends AbstractModule<ModuleType.Envelope> {
  constructor(context: SamplerNode) {
    super(context, ModuleType.Envelope)
  }
}
