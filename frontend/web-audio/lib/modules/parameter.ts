import { AbstractStatefulModule, State } from '.'
import { ModuleType } from '..'
import { SobakaContext } from '../sobaka.node'

export class Parameter extends AbstractStatefulModule<ModuleType.Parameter> {
  constructor(context: SobakaContext, initial_state: State<ModuleType.Parameter>) {
    super(context, ModuleType.Parameter, initial_state)
  }
}
