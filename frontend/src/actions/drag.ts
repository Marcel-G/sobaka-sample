interface ActionResult<P> {
  update?: (parameters?: P) => void
  destroy?: () => void
}

export type Action<P> = (node: Element, parameters: P) => ActionResult<P>

export type OnDrag = (x: number, y: number, element: Element) => void

const is_mouse_event = (event: Event): event is MouseEvent => {
  return 'clientX' in event && 'clientY' in event
}

const is_touch_event = (event: Event): event is TouchEvent => {
  return 'touches' in event
}

const get_interaction_position = (event: Event) => {
  if (is_mouse_event(event)) {
    return {
      client_x: event.clientX,
      client_y: event.clientY
    }
  } else if (is_touch_event(event)) {
    return {
      client_x: event.touches[0].clientX,
      client_y: event.touches[0].clientY
    }
  } else {
    throw new Error('Event type not supported')
  }
}

export const useDrag: Action<OnDrag> = (node, onDrag) => {
  let origin_x: number
  let origin_y: number

  const handle_mousedown = (event: Event) => {
    if (
      event.target !== node &&
      (event.target as HTMLElement).getAttribute('draggable') === null
    ) {
      return
    }

    // Calculate click / tap offset and use it as the movement origin.
    const rect = node.getBoundingClientRect()
    const interaction = get_interaction_position(event)
    origin_x = interaction.client_x - rect.left
    origin_y = interaction.client_y - rect.top

    window.addEventListener('mousemove', handle_mouse_move, { passive: true })
    window.addEventListener('touchmove', handle_mouse_move, { passive: true })
    window.addEventListener('mouseup', handle_mouseup, { passive: true })
    window.addEventListener('touchend', handle_mouseup, { passive: true })
  }

  const handle_mouse_move = (event: MouseEvent | TouchEvent) => {
    // All coordinates are relative to the parent element, not entire page.
    const parent = node.parentElement
    if (parent instanceof Element) {
      const parent_rect = parent.getBoundingClientRect()
      const clientX = 'clientX' in event ? event.clientX : event.touches[0].clientX
      const clientY = 'clientY' in event ? event.clientY : event.touches[0].clientY

      const x = clientX - parent_rect.left - origin_x
      const y = clientY - parent_rect.top - origin_y

      onDrag(x, y, node)
    }
  }

  const handle_mouseup = () => {
    window.removeEventListener('mousemove', handle_mouse_move)
    window.removeEventListener('touchmove', handle_mouse_move)
    window.removeEventListener('mouseup', handle_mouseup)
    window.removeEventListener('touchend', handle_mouseup)
  }

  node.addEventListener('mousedown', handle_mousedown, { passive: true })
  node.addEventListener('touchstart', handle_mousedown, { passive: true })

  return {
    destroy() {
      node.removeEventListener('mousedown', handle_mousedown)
      node.removeEventListener('touchstart', handle_mousedown)
    }
  }
}

export default useDrag
