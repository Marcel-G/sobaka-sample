import Clock from './Clock.svelte'
import Mixer from './Mixer.svelte'
import Oscillator from './Oscillator/Oscillator.svelte'
import Noise from './Noise.svelte'
import Filter from './Filter.svelte'
import Envelope from './Envelope/Envelope.svelte'
import Delay from './Delay.svelte'
import Reverb from './Reverb.svelte'
import Quantiser from './Quantiser.svelte'
import SampleAndHold from './SampleAndHold.svelte'
import { type Module } from '@sobaka/state/models/workspace'

export const MODULES = {
  Clock,
  Mixer,
  Oscillator,
  Noise,
  Filter,
  Envelope,
  Delay,
  Reverb,
  Quantiser,
  SampleAndHold,
} as const

export const getComponent = (module: Module) => {
  return MODULES[module.type as keyof typeof MODULES]
}
