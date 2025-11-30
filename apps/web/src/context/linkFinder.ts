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

export const linkFinder = (
  link: Partial<Link> | null,
  plugPositions: Map<string, PlugPosition>,
  mousePosition: Position,
  plugTypeGetter: (linkPoint: LinkPoint) => PlugType
): Required<Link>[] => {
  if (link == null || (link.from && link.to)) {
    return []
  }
  const startPoint = link.from || link.to!
  const start = plugPositions.get(linkPointToKey(startPoint))
  if (!start) {
    return []
  }

  const plugs = Array.from(plugPositions.values()).filter(plug => {
    const type = plugTypeGetter(plug.id)
    if (link.from) {
      if (link.from.moduleId === plug.id.moduleId) return false
      return [PlugType.Input, PlugType.Param, PlugType.Mixer].includes(type)
    } else if (link.to) {
      if (link.to.moduleId === plug.id.moduleId) return false
      return type === PlugType.Output
    }
    return false
  })

  plugs.sort((a, b) => distance(start, a) - distance(start, b))

  const end = selectEnd(plugs, mousePosition)

  if (!end) return []

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
