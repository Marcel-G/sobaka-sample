import Clock from './Clock.svelte'
import Mixer from './Mixer.svelte'
import Oscillator from './Oscillator/Oscillator.svelte'
import Noise from './Noise.svelte'
import Filter from './Filter.svelte'
import Envelope from './Envelope/Envelope.svelte'
import { type Module } from '@sobaka/state/models/workspace'

export const MODULES = {
  Clock,
  Mixer,
  Oscillator,
  Noise,
  Filter,
  Envelope,
} as const

export const getComponent = (module: Module) => {
  return MODULES[module.type as keyof typeof MODULES]
}
