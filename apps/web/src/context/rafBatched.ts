import { derived, get, type Readable } from 'svelte/store'

/**
 * Wraps a store to batch updates to once per animation frame.
 * The underlying store can update as frequently as needed, but subscribers
 * will only receive the latest value once per RAF.
 * 
 * @param store - The source store to batch
 * @returns A new store that emits at most once per animation frame
 */
export function rafBatched<T>(store: Readable<T>): Readable<T> {
  let rafId: number | null = null
  let latestValue: T = get(store)
  let hasPendingUpdate = false

  return derived(
    store,
    (value, set) => {
      // Store the latest value
      latestValue = value
      hasPendingUpdate = true

      // Schedule RAF update if not already scheduled
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          if (hasPendingUpdate) {
            set(latestValue)
            hasPendingUpdate = false
          }
          rafId = null
        })
      }

      // Cleanup function
      return () => {
        if (rafId !== null) {
          cancelAnimationFrame(rafId)
          rafId = null
        }
      }
    },
    get(store) // Initial value
  )
}
