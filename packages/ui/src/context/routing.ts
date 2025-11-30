import { getContext, setContext } from 'svelte'
import type { ModuleRouting } from '@sobaka/dsp/shared/types'
import { writable, type Writable } from 'svelte/store'

const ROUTING_KEY = Symbol('module-routing')

export interface RoutingContext {
  routing: Writable<ModuleRouting | null>
}

/**
 * Provide module routing to child components
 * This allows automatic rendering of plugs based on DSP layer routing
 */
export function provideRouting(): RoutingContext {
  const routing = writable<ModuleRouting | null>(null)
  const context: RoutingContext = { routing }
  setContext(ROUTING_KEY, context)
  return context
}

/**
 * Get module routing from context
 */
export function getRouting(): RoutingContext {
  const context = getContext<RoutingContext>(ROUTING_KEY)
  if (!context) {
    throw new Error('Routing context not found. Did you forget to call provideRouting()?')
  }
  return context
}
