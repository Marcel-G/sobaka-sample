import { AbstractModule } from '.'
import { ModuleType } from '../../pkg/sobaka_sample_web_audio_rpc'
import { SamplerNode } from '../sampler.node'

export class Envelope extends AbstractModule<ModuleType.Envelope> {
  constructor(context: SamplerNode) {
    super(context, ModuleType.Envelope)
  }
}
