/**
 * Type-safe EventEmitter for TypeScript
 * 
 * A minimal event emitter with full TypeScript type inference.
 * Uses a more flexible type system that accepts any function signature.
 */

import { createLogger } from '../../util/logger'

const logger = createLogger('EventEmitter')

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EventMap = Record<string, (...args: any[]) => void>

export class EventEmitter<Events extends EventMap> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _listeners = new Map<keyof Events, Set<(...args: any[]) => void>>()

  /**
   * Add an event listener
   */
  on<K extends keyof Events>(event: K, listener: Events[K]): this {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set())
    }
    this._listeners.get(event)!.add(listener)
    return this
  }

  /**
   * Add a one-time event listener
   */
  once<K extends keyof Events>(event: K, listener: Events[K]): this {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onceWrapper = (...args: any[]) => {
      this.off(event, onceWrapper as Events[K])
      listener(...args)
    }
    
    return this.on(event, onceWrapper as Events[K])
  }

  /**
   * Remove an event listener
   */
  off<K extends keyof Events>(event: K, listener: Events[K]): this {
    const eventListeners = this._listeners.get(event)
    if (eventListeners) {
      eventListeners.delete(listener)
      if (eventListeners.size === 0) {
        this._listeners.delete(event)
      }
    }
    return this
  }

  /**
   * Emit an event
   */
  emit<K extends keyof Events>(event: K, ...args: Parameters<Events[K]>): boolean {
    const eventListeners = this._listeners.get(event)
    if (!eventListeners || eventListeners.size === 0) {
      return false
    }
    
    for (const listener of eventListeners) {
      try {
        listener(...args)
      } catch (err) {
        logger.error(`Error in listener for "${String(event)}":`, err)
      }
    }
    
    return true
  }

  /**
   * Remove all listeners for an event, or all events
   */
  removeAllListeners<K extends keyof Events>(event?: K): this {
    if (event !== undefined) {
      this._listeners.delete(event)
    } else {
      this._listeners.clear()
    }
    return this
  }

  /**
   * Get listener count for an event
   */
  listenerCount<K extends keyof Events>(event: K): number {
    return this._listeners.get(event)?.size ?? 0
  }

  /**
   * Get all listeners for an event
   */
  getListeners<K extends keyof Events>(event: K): Events[K][] {
    const eventListeners = this._listeners.get(event)
    return eventListeners ? Array.from(eventListeners) as Events[K][] : []
  }
}
