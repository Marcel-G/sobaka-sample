import { AbstractModule } from '.'
import { ModuleType } from '..'
import { SamplerNode } from '../sampler.node'

export class Volume extends AbstractModule<ModuleType.Volume> {
  constructor(context: SamplerNode) {
    super(context, ModuleType.Volume)
  }
}
