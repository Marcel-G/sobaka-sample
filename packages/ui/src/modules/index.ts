import Clock from './Clock.svelte'
import Mixer from './Mixer.svelte'
import Oscillator from './Oscillator/Oscillator.svelte'
import { type Module } from '@sobaka/state/models/workspace'

export const MODULES = {
  Clock,
  Mixer,
  Oscillator,
} as const

export const getComponent = (module: Module) => {
  return MODULES[module.type as keyof typeof MODULES]
}
