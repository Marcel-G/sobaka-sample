import { AbstractModule } from '.'
import { ModuleType } from '..'
import { SamplerNode } from '../sampler.node'

export class Clock extends AbstractModule<ModuleType.Clock> {
  constructor(context: SamplerNode) {
    super(context, ModuleType.Clock)
  }
}
