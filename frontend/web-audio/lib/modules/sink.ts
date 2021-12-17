import { AbstractModule } from '.'
import { ModuleType } from '../../pkg/sobaka_sample_web_audio_rpc'
import { SamplerNode } from '../sampler.node'

export class Sink extends AbstractModule<ModuleType.Sink> {
  constructor(context: SamplerNode) {
    super(context, ModuleType.Sink)
  }
}
