import { AbstractStatefulModule } from '.'
import { ModuleType, OscillatorState } from '../../pkg/sobaka_sample_web_audio_rpc'
import { SamplerNode } from '../sampler.node'

export class Oscillator extends AbstractStatefulModule<
  ModuleType.Oscillator,
  OscillatorState
> {
  constructor(context: SamplerNode) {
    super(context, ModuleType.Oscillator)
  }
}
