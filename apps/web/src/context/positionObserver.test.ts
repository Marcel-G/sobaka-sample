import { describe, it } from 'node:test'
import assert from 'node:assert'
import { PositionObserver } from './positionObserver'

describe('PositionObserver', () => {
  it('should call callback when element is observed', async () => {
    const observer = new PositionObserver()
    const element = document.createElement('div')
    document.body.appendChild(element)

    let callCount = 0
    let calledElement: Element | null = null

    observer.observe(element, el => {
      callCount++
      calledElement = el
    })

    // Wait for initial requestAnimationFrame
    await new Promise(resolve => requestAnimationFrame(resolve))

    assert.strictEqual(callCount, 1)
    assert.strictEqual(calledElement, element)

    observer.destroy()
    document.body.removeChild(element)
  })

  it('should not observe the same element twice', async () => {
    const observer = new PositionObserver()
    const element = document.createElement('div')
    document.body.appendChild(element)

    let callback1Count = 0
    let callback2Count = 0

    observer.observe(element, () => {
      callback1Count++
    })
    observer.observe(element, () => {
      callback2Count++
    })

    await new Promise(resolve => requestAnimationFrame(resolve))

    // Only the first callback should be called
    assert.ok(callback1Count > 0)
    assert.strictEqual(callback2Count, 0)

    observer.destroy()
    document.body.removeChild(element)
  })

  it('should stop observing when unobserve is called', async () => {
    const observer = new PositionObserver()
    const element = document.createElement('div')
    document.body.appendChild(element)

    let callCount = 0

    observer.observe(element, () => {
      callCount++
    })
    await new Promise(resolve => requestAnimationFrame(resolve))

    const initialCount = callCount
    observer.unobserve(element)

    // Trigger a style change
    element.style.left = '100px'
    await new Promise(resolve => requestAnimationFrame(resolve))

    // Callback should not be called after unobserve
    assert.strictEqual(callCount, initialCount)

    observer.destroy()
    document.body.removeChild(element)
  })

  it('should force update immediately', async () => {
    const observer = new PositionObserver()
    const element = document.createElement('div')
    document.body.appendChild(element)

    let callCount = 0

    observer.observe(element, () => {
      callCount++
    })
    await new Promise(resolve => requestAnimationFrame(resolve))

    const initialCount = callCount
    observer.forceUpdate(element)

    assert.ok(callCount > initialCount)

    observer.destroy()
    document.body.removeChild(element)
  })

  it('should clean up all observers on destroy', () => {
    const observer = new PositionObserver()
    const element = document.createElement('div')
    document.body.appendChild(element)

    observer.observe(element, () => {})

    // Verify destroy doesn't throw
    assert.doesNotThrow(() => {
      observer.destroy()
    })

    document.body.removeChild(element)
  })
})
