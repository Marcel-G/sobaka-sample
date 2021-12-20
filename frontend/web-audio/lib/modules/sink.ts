import { AbstractModule } from '.'
import { ModuleType } from '..'
import { SamplerNode } from '../sampler.node'

export class Sink extends AbstractModule<ModuleType.Sink> {
  constructor(context: SamplerNode) {
    super(context, ModuleType.Sink)
  }
}
