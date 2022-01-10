import { AbstractModule } from '.'
import { ModuleType, VolumeInput } from '..'
import { SobakaContext } from '../sobaka.node'

export class Volume extends AbstractModule<ModuleType.Volume> {
  static Input = VolumeInput
  constructor(context: SobakaContext) {
    super(context, ModuleType.Volume)
  }
}
