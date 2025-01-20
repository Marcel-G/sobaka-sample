import type { Position } from '../@types'
import { plug_type, PlugType, type Link } from '../models/workspace'
import { type PlugPosition } from './positions'

const distance = (a: PlugPosition, b: PlugPosition): number => {
  return Math.abs(a.position.x - b.position.x) + Math.abs(a.position.y - b.position.y)
}

const moduleId = (id: string) => id.split('/')[0]

const selectEnd = (plugs: PlugPosition[], mousePosition: Position) => {
  const mouse = { id: 'mouse', position: mousePosition }

  const inMouseRange = plugs.filter(plug => distance(plug, mouse) < 250)

  const [plug] = inMouseRange.sort((a, b) => distance(a, mouse) - distance(b, mouse))

  if (plug) return plug

  return plugs[0]
}

export const linkFinder = (
  link: Partial<Link> | null,
  plugPositions: Map<string, PlugPosition>,
  mousePosition: Position
): Required<Link>[] => {
  if (link == null || (link.from && link.to)) {
    return []
  }
  const start = plugPositions.get(link.from || link.to!)
  if (!start) {
    return []
  }

  const plugs = Array.from(plugPositions.values()).filter(plug => {
    const type = plug_type(plug.id)
    if (link.from) {
      if (moduleId(link.from) === moduleId(plug.id)) return false
      return [PlugType.Input, PlugType.Param].includes(type)
    } else if (link.to) {
      if (moduleId(link.to) === moduleId(plug.id)) return false
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
