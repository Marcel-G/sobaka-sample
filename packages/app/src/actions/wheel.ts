import type { Action } from 'svelte/action'

export type OnWheel = (
  event: WheelEvent,
  pos: { x: number; y: number },
  element: Element
) => void
export type OnWheelStart = (event: WheelEvent, element: Element) => void

export const useWheel: Action<
  HTMLElement | SVGElement,
  { onWheel?: OnWheel; onWheelStart?: OnWheelStart }
> = (node, { onWheel, onWheelStart } = {}) => {
  let isWheeling = false
  let x = 0
  let y = 0
  let wheelingTimeout: ReturnType<typeof setTimeout>

  const handle_wheel = (event: Event) => {
    if (!(event instanceof WheelEvent)) return

    event.stopPropagation()
    event.preventDefault()

    if (!isWheeling) {
      onWheelStart?.(event, node)
      isWheeling = true
    }

    x -= event.deltaX / 1500
    y -= event.deltaY / 1500

    onWheel?.(event, { x, y }, node)

    clearTimeout(wheelingTimeout)
    wheelingTimeout = setTimeout(() => {
      isWheeling = false
      x = 0
      y = 0
    }, 500)
  }

  node.addEventListener('wheel', handle_wheel)

  return {
    destroy() {
      node.removeEventListener('wheel', handle_wheel)
    }
  }
}

export default useWheel
