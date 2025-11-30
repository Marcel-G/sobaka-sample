import Clock from './Clock.svelte'
import { type Module } from '@sobaka/state/models/workspace'

export const MODULES = {
  Clock,
} as const

export const get_component = (module: Module) => {
  return MODULES[module.type as keyof typeof MODULES]
}
