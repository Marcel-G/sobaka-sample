import { AbstractStatefulModule } from '.'
import { ModuleType, ParameterState } from '..'
import { SamplerNode } from '../sampler.node'

export class Parameter extends AbstractStatefulModule<
  ModuleType.Parameter,
  ParameterState
> {
  constructor(context: SamplerNode) {
    super(context, ModuleType.Parameter)
  }
}
