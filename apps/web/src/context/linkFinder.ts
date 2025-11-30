import { derived, get, type Readable } from 'svelte/store'
import { PlugType, type Link, type LinkPoint, linkPointToKey } from '@sobaka/state/models/links'
import { type PlugPosition } from './positions'
import type { Position } from '@sobaka/state'

const distance = (a: PlugPosition, b: PlugPosition): number => {
  return Math.abs(a.position.x - b.position.x) + Math.abs(a.position.y - b.position.y)
}

const selectEnd = (plugs: PlugPosition[], mousePosition: Position) => {
  const mouse = { id: { moduleId: 'mouse', routeName: 'mouse' }, position: mousePosition }

  const inMouseRange = plugs.filter(plug => distance(plug, mouse) < 250)

  const [plug] = inMouseRange.sort((a, b) => distance(a, mouse) - distance(b, mouse))

  if (plug) return plug

  return plugs[0]
}

/**
 * Checks if a link is partial (has one endpoint defined but not the other)
 */
export const isPartialLink = (link: Partial<Link> | null): boolean => {
  if (link == null) return false
  return (link.from && !link.to) || (!link.from && link.to)
}

export const linkFinder = (
  link: Partial<Link> | null,
  plugPositions: Map<string, PlugPosition>,
  mousePosition: Position,
  plugTypeGetter: (linkPoint: LinkPoint) => PlugType
): Required<Link>[] => {
  // Early exit if no partial link exists
  if (!isPartialLink(link)) {
    return []
  }
  
  // Get the first clicked point (could be in either from or to)
  const startPoint = link.from || link.to!
  const start = plugPositions.get(linkPointToKey(startPoint))
  if (!start) {
    return []
  }

  // Get the type of the plug that was clicked first
  const startType = plugTypeGetter(startPoint)
  
  // Filter for compatible plugs based on what was clicked
  const plugs = Array.from(plugPositions.values()).filter(plug => {
    // Don't connect to same module
    if (startPoint.moduleId === plug.id.moduleId) return false
    
    const plugType = plugTypeGetter(plug.id)
    
    // If we clicked an output, we need input/param/mixer
    if (startType === PlugType.Output) {
      return [PlugType.Input, PlugType.Param, PlugType.Mixer].includes(plugType)
    }
    // If we clicked input/param/mixer, we need output
    else {
      return plugType === PlugType.Output
    }
  })

  plugs.sort((a, b) => distance(start, a) - distance(start, b))

  const end = selectEnd(plugs, mousePosition)

  if (!end) return []

  // Return the link - doesn't matter which field we use (from/to)
  // since normalizeLink will fix the direction when it's added
  if (link.from) {
    return [{ id: 'active-link', from: link.from, to: end.id }]
  }
  return [{ id: 'active-link', from: end.id, to: link.to! }]
}

export const memoizeLast = <T>(
  store: Readable<T>,
  cmp: (previous: T, next: T) => boolean
): Readable<T> => {
  let lastValue: T = get(store)

  return derived(
    store,
    (value, set) => {
      if (!cmp(lastValue, value)) {
        lastValue = value
        set(value)
      }
    },
    get(store)
  )
}

export const throttled = <T>(store: Readable<T>) => {
  let frame: number | null = null
  let lastValue: T = get(store)

  return derived(
    store,
    ($value, set) => {
      lastValue = $value

      if (frame === null) {
        frame = requestAnimationFrame(() => {
          set(lastValue)
          frame = null
        })
      }

      return () => {
        if (frame !== null) {
          cancelAnimationFrame(frame)
          frame = null
        }
      }
    },
    get(store)
  )
}

export const linkFinderCmp = (
  a: ReturnType<typeof linkFinder>,
  b: ReturnType<typeof linkFinder>
) => {
  if (a.length !== b.length) return false
  return a.every((_a, i) => {
    const _b = b[i]
    return _b.from.moduleId === _a.from.moduleId && 
           _b.from.routeName === _a.from.routeName &&
           _b.to.moduleId === _a.to.moduleId && 
           _b.to.routeName === _a.to.routeName
  })
}
