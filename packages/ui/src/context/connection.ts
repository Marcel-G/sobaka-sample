import { getContext, setContext } from 'svelte'
import type { Readable } from 'svelte/store'

const CONNECTION_KEY = Symbol('plug-connection')

export type IsPlugConnected = (routeName: string) => boolean

export interface ConnectionContext {
  isPlugConnected: Readable<IsPlugConnected>
}

/**
 * Provide plug connection checker to child components
 * Called by ModuleWrapper to make connection state available to Plug components
 */
export function provideConnectionContext(isPlugConnected: Readable<IsPlugConnected>): void {
  setContext(CONNECTION_KEY, { isPlugConnected })
}

/**
 * Get connection context - returns undefined if not in a module context
 * Used by Plug to check its own connection status
 */
export function getConnectionContext(): ConnectionContext | undefined {
  return getContext<ConnectionContext>(CONNECTION_KEY)
}
