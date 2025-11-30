/**
 * Position Observer System
 * 
 * Efficiently tracks DOM element position changes using:
 * - ResizeObserver: Detects size changes of modules
 * - MutationObserver: Detects style/attribute changes (position updates)
 * - Scroll/Resize listeners: Handles viewport changes for fixed-position elements
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
  private workspaceElement: Element | null = null
  private scrollHandler: (() => void) | null = null
  private resizeHandler: (() => void) | null = null

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
    
    // Set up workspace scroll/resize handlers for fixed-position elements
    this.setupWorkspaceListeners()
  }
  
  /**
   * Set up listeners for workspace scroll and window resize
   * These are needed for fixed-position elements that move relative to viewport
   */
  private setupWorkspaceListeners() {
    this.scrollHandler = () => {
      // When workspace scrolls, all positions need to be recalculated
      // because fixed-position elements stay in place relative to viewport
      this.scheduleUpdateAll()
    }
    
    this.resizeHandler = () => {
      // When window resizes, fixed-position elements move
      this.scheduleUpdateAll()
    }
    
    // Add listeners (will attach to workspace when first element is observed)
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.resizeHandler, { passive: true })
    }
  }
  
  /**
   * Schedule updates for all observed elements
   */
  private scheduleUpdateAll() {
    Array.from(this.entries.keys()).forEach(element => {
      this.scheduleUpdate(element)
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
    
    Array.from(this.pendingUpdates).forEach(element => {
      const entry = this.entries.get(element)
      if (entry && now - entry.lastUpdate >= THROTTLE_MS) {
        this.executeUpdate(element, entry)
      }
    })

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

    // Find and track the workspace element for scroll events
    if (!this.workspaceElement) {
      const workspace = document.querySelector('[data-kind="workspace"]')
      if (workspace) {
        this.workspaceElement = workspace
        
        // Attach scroll listener to the main scroll container
        // The workspace is inside <main> which has overflow-x: auto
        const scrollContainer = workspace.closest('main')
        if (scrollContainer && this.scrollHandler) {
          scrollContainer.addEventListener('scroll', this.scrollHandler, { passive: true })
        }
      }
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
    
    // Clean up scroll and resize listeners
    if (this.workspaceElement && this.scrollHandler) {
      const scrollContainer = this.workspaceElement.closest('main')
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', this.scrollHandler)
      }
    }
    
    if (this.resizeHandler && typeof window !== 'undefined') {
      window.removeEventListener('resize', this.resizeHandler)
    }
    
    this.workspaceElement = null
    this.scrollHandler = null
    this.resizeHandler = null
  }
}
