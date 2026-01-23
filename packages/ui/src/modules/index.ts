import Clock from './Clock.svelte'
import Oscillator from './Oscillator/Oscillator.svelte'
import Noise from './Noise.svelte'
import Filter from './Filter.svelte'
import Envelope from './Envelope/Envelope.svelte'
import Delay from './Delay.svelte'
import Reverb from './Reverb.svelte'
import Quantiser from './Quantiser.svelte'
import SampleAndHold from './SampleAndHold.svelte'
import Parameter from './Parameter.svelte'
import Vca from './Vca.svelte'
import Scope from './Scope/Scope.svelte'
import Lfo from './Lfo/Lfo.svelte'
import Euclidean from './Euclidean/Euclidean.svelte'
import { type Module } from '@sobaka/state/models/workspace'

export const MODULES = {
  Clock,
  Delay,
  Envelope,
  Euclidean,
  Filter,
  Lfo,
  Noise,
  Oscillator,
  Parameter,
  Quantiser,
  Reverb,
  SampleAndHold,
  Scope,
  Vca,
} as const

export const getComponent = (module: Module) => {
  return MODULES[module.type as keyof typeof MODULES]
}
