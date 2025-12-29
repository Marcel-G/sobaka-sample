import { describe, it, mock } from 'node:test'
import assert from 'node:assert'
import { writable, get } from 'svelte/store'
import { rafBatched } from './rafBatched'

// Mock requestAnimationFrame for testing
global.requestAnimationFrame = mock.fn((cb: FrameRequestCallback) => {
  // Execute immediately in tests
  setTimeout(() => cb(0), 0)
  return 1
})

global.cancelAnimationFrame = mock.fn(() => {})

describe('rafBatched', () => {
  it('should batch multiple updates into a single RAF emission', async () => {
    const source = writable(0)
    const batched = rafBatched(source)

    const emissions: number[] = []
    batched.subscribe(value => {
      emissions.push(value)
    })

    // Initial subscription should emit immediately
    assert.strictEqual(emissions.length, 1)
    assert.strictEqual(emissions[0], 0)

    // Multiple rapid updates
    source.set(1)
    source.set(2)
    source.set(3)

    // Should not have emitted yet (waiting for RAF)
    assert.strictEqual(emissions.length, 1)

    // Wait for RAF to execute
    await new Promise(resolve => setTimeout(resolve, 10))

    // Should have emitted only once with the latest value
    assert.strictEqual(emissions.length, 2)
    assert.strictEqual(emissions[1], 3)
  })

  it('should emit the initial value immediately on subscription', () => {
    const source = writable(42)
    const batched = rafBatched(source)

    const value = get(batched)
    assert.strictEqual(value, 42)
  })

  it('should handle updates after RAF has completed', async () => {
    const source = writable(0)
    const batched = rafBatched(source)

    const emissions: number[] = []
    batched.subscribe(value => {
      emissions.push(value)
    })

    // First update
    source.set(1)
    await new Promise(resolve => setTimeout(resolve, 10))

    assert.strictEqual(emissions.length, 2)
    assert.strictEqual(emissions[1], 1)

    // Second update after first RAF completed
    source.set(2)
    await new Promise(resolve => setTimeout(resolve, 10))

    assert.strictEqual(emissions.length, 3)
    assert.strictEqual(emissions[2], 2)
  })
})
