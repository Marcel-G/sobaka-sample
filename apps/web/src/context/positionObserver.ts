/**
 * Position Observer System
 * 
 * Efficiently tracks DOM element position changes using:
 * - ResizeObserver: Detects size changes of modules
 * - MutationObserver: Detects style/attribute changes (position updates)
 * - Throttling: Limits update frequency to avoid expensive recalculations
 */

type UpdateCallback = (element: Element) => void

interface ObserverEntry {
  element: Element
  callback: UpdateCallback
  lastUpdate: number
}

const THROTTLE_MS = 16 // ~60fps, tune this based on performance needs

export class PositionObserver {
  private resizeObserver: ResizeObserver
  private mutationObserver: MutationObserver
  private entries = new Map<Element, ObserverEntry>()
  private pendingUpdates = new Set<Element>()
  private rafId: number | null = null

  constructor() {
    // ResizeObserver handles module size changes and position changes
    // (ResizeObserver fires when elements move, not just resize)
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        this.scheduleUpdate(entry.target)
      }
    })

    // MutationObserver handles style/class changes that might affect position
    this.mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes') {
          // Style or class attribute changed
          if (mutation.attributeName === 'style' || mutation.attributeName === 'class') {
            this.scheduleUpdate(mutation.target as Element)
          }
        }
      }
    })
  }

  /**
   * Schedule an update for an element (throttled)
   */
  private scheduleUpdate(element: Element) {
    const entry = this.entries.get(element)
    if (!entry) return

    // Check if we should throttle this update
    const now = Date.now()
    const timeSinceLastUpdate = now - entry.lastUpdate

    if (timeSinceLastUpdate < THROTTLE_MS) {
      // Add to pending and schedule RAF if not already scheduled
      this.pendingUpdates.add(element)
      if (this.rafId === null) {
        this.rafId = requestAnimationFrame(() => this.processPendingUpdates())
      }
    } else {
      // Update immediately
      this.executeUpdate(element, entry)
    }
  }

  /**
   * Process all pending updates in a single animation frame
   */
  private processPendingUpdates() {
    const now = Date.now()
    
    for (const element of this.pendingUpdates) {
      const entry = this.entries.get(element)
      if (entry && now - entry.lastUpdate >= THROTTLE_MS) {
        this.executeUpdate(element, entry)
      }
    }

    this.pendingUpdates.clear()
    this.rafId = null
  }

  /**
   * Execute the update callback for an element
   */
  private executeUpdate(element: Element, entry: ObserverEntry) {
    entry.lastUpdate = Date.now()
    entry.callback(element)
  }

  /**
   * Observe an element for position/size changes
   */
  observe(element: Element, callback: UpdateCallback) {
    // Don't re-observe if already observing
    if (this.entries.has(element)) {
      return
    }

    const entry: ObserverEntry = {
      element,
      callback,
      lastUpdate: 0
    }

    this.entries.set(element, entry)

    // Start observing with both observers
    this.resizeObserver.observe(element)
    this.mutationObserver.observe(element, {
      attributes: true,
      attributeFilter: ['style', 'class']
    })

    // Also observe parent for transforms/position changes that affect this element
    const parent = element.parentElement
    if (parent && parent.getAttribute('data-kind') === 'workspace') {
      // Watch workspace for scroll/transform changes
      this.mutationObserver.observe(parent, {
        attributes: true,
        attributeFilter: ['style']
      })
    }

    // Initial update to capture current position
    requestAnimationFrame(() => {
      this.executeUpdate(element, entry)
    })
  }

  /**
   * Stop observing an element
   */
  unobserve(element: Element) {
    const entry = this.entries.get(element)
    if (!entry) return

    this.resizeObserver.unobserve(element)
    this.entries.delete(element)
    this.pendingUpdates.delete(element)
  }

  /**
   * Manually trigger an update for an element (e.g., after drag)
   */
  forceUpdate(element: Element) {
    const entry = this.entries.get(element)
    if (!entry) return

    this.executeUpdate(element, entry)
  }

  /**
   * Clean up all observers
   */
  destroy() {
    this.resizeObserver.disconnect()
    this.mutationObserver.disconnect()
    this.entries.clear()
    this.pendingUpdates.clear()
    
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }
}
