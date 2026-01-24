/**
 * Type-safe EventEmitter for TypeScript
 * 
 * A minimal event emitter with full TypeScript type inference
 */

export type EventMap = Record<string, (...args: unknown[]) => void>

export class EventEmitter<Events extends EventMap> {
  private listeners = new Map<keyof Events, Set<Events[keyof Events]>>()

  /**
   * Add an event listener
   */
  on<K extends keyof Events>(event: K, listener: Events[K]): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(listener)
    return this
  }

  /**
   * Add a one-time event listener
   */
  once<K extends keyof Events>(event: K, listener: Events[K]): this {
    const onceWrapper = ((...args: Parameters<Events[K]>) => {
      this.off(event, onceWrapper as Events[K])
      ;(listener as (...args: Parameters<Events[K]>) => void)(...args)
    }) as Events[K]
    
    return this.on(event, onceWrapper)
  }

  /**
   * Remove an event listener
   */
  off<K extends keyof Events>(event: K, listener: Events[K]): this {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      eventListeners.delete(listener)
      if (eventListeners.size === 0) {
        this.listeners.delete(event)
      }
    }
    return this
  }

  /**
   * Emit an event
   */
  emit<K extends keyof Events>(event: K, ...args: Parameters<Events[K]>): boolean {
    const eventListeners = this.listeners.get(event)
    if (!eventListeners || eventListeners.size === 0) {
      return false
    }
    
    for (const listener of eventListeners) {
      try {
        (listener as (...args: Parameters<Events[K]>) => void)(...args)
      } catch (err) {
        console.error(`[EventEmitter] Error in listener for "${String(event)}":`, err)
      }
    }
    
    return true
  }

  /**
   * Remove all listeners for an event, or all events
   */
  removeAllListeners<K extends keyof Events>(event?: K): this {
    if (event !== undefined) {
      this.listeners.delete(event)
    } else {
      this.listeners.clear()
    }
    return this
  }

  /**
   * Get listener count for an event
   */
  listenerCount<K extends keyof Events>(event: K): number {
    return this.listeners.get(event)?.size ?? 0
  }

  /**
   * Get all listeners for an event
   */
  listeners<K extends keyof Events>(event: K): Events[K][] {
    const eventListeners = this.listeners.get(event)
    return eventListeners ? Array.from(eventListeners) : []
  }
}
