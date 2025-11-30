import type { Action } from 'svelte/action'

export type OnDrag = (
  event: MouseEvent | TouchEvent,
  origin: { originX: number; originY: number },
  element: Element
) => void
export type OnDragStart = (
  event: MouseEvent | TouchEvent,
  origin: { originX: number; originY: number },
  element: Element
) => void

const isMouseEvent = (event: Event): event is MouseEvent => {
  return 'clientX' in event && 'clientY' in event
}

const isTouchEvent = (event: Event): event is TouchEvent => {
  return 'touches' in event
}

const getInteractionPosition = (event: Event) => {
  if (isMouseEvent(event)) {
    return {
      client_x: event.clientX,
      client_y: event.clientY
    }
  } else if (isTouchEvent(event)) {
    return {
      client_x: event.touches[0].clientX,
      client_y: event.touches[0].clientY
    }
  } else {
    throw new Error('Event type not supported')
  }
}

export const useDrag: Action<
  HTMLElement | SVGElement,
  { onDrag?: OnDrag; onDragStart?: OnDragStart }
> = (node, { onDragStart, onDrag } = {}) => {
  let originX: number
  let originY: number

  const handleMousedown = (event: Event) => {
    // Only fire for primary mouse button
    if (isMouseEvent(event) && event.button !== 0) return

    event.stopImmediatePropagation()
    // Calculate click / tap offset and use it as the movement origin.
    const rect = node.getBoundingClientRect()
    const interaction = getInteractionPosition(event)
    originX = interaction.client_x - rect.left
    originY = interaction.client_y - rect.top

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    window.addEventListener('touchmove', handleMouseMove, { passive: true })
    window.addEventListener('mouseup', handleMouseup, { passive: true })
    window.addEventListener('touchend', handleMouseup, { passive: true })

    if (isMouseEvent(event) || isTouchEvent(event)) {
      onDragStart?.(event, { originX, originY }, node)
    }
  }

  const handleMouseMove = (event: MouseEvent | TouchEvent) => {
    onDrag?.(event, { originX, originY }, node)
  }

  const handleMouseup = () => {
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('touchmove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseup)
    window.removeEventListener('touchend', handleMouseup)
  }

  node.addEventListener('mousedown', handleMousedown, { passive: true })
  node.addEventListener('touchstart', handleMousedown, { passive: true })

  return {
    destroy() {
      node.removeEventListener('mousedown', handleMousedown)
      node.removeEventListener('touchstart', handleMousedown)
    }
  }
}

export const relativeToElement = (
  event: MouseEvent | TouchEvent,
  origin: { originX: number; originY: number },
  element: Element
) => {
  // All coordinates are relative to the parent element, not entire page.
  const parentRect = element.getBoundingClientRect()
  const clientX = 'clientX' in event ? event.clientX : event.touches[0].clientX
  const clientY = 'clientY' in event ? event.clientY : event.touches[0].clientY

  const x = clientX - parentRect.left - origin.originX
  const y = clientY - parentRect.top - origin.originY

  return { x, y }
}

export default useDrag
