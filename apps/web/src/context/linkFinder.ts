import { PlugType, type Link, type LinkPoint, linkPointToKey } from '@sobaka/state/models/links'
import { type PlugPosition } from './positions'
import type { Position } from '@sobaka/state'
import type { AudioGraph } from '@sobaka/dsp'

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
  return !!(link.from && !link.to) || !!(!link.from && link.to)
}

export const linkFinder = (
  link: Partial<Link> | null,
  plugPositions: Map<string, PlugPosition>,
  mousePosition: Position,
  dsp: AudioGraph
): Required<Link>[] => {
  // Early exit if no partial link exists
  if (!link || !isPartialLink(link)) {
    return []
  }
  
  // At this point we know link is not null and has exactly one endpoint
  // Get the first clicked point (could be in either from or to)
  const startPoint = (link.from || link.to) as LinkPoint
  const start = plugPositions.get(linkPointToKey(startPoint))
  if (!start) {
    return []
  }

  // Get the type of the plug that was clicked first
  const startType = dsp.getPlugType(startPoint.moduleId, startPoint.routeName)
  if (!startType) return []
  
  // Filter for compatible plugs based on what was clicked
  const plugs = Array.from(plugPositions.values()).filter(plug => {
    // Don't connect to same module
    if (startPoint.moduleId === plug.id.moduleId) return false
    
    const plugType = dsp.getPlugType(plug.id.moduleId, plug.id.routeName)
    if (!plugType) return false
    
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

  // Return the link with proper from/to assignment
  if (link.from) {
    return [{ id: 'active-link', from: link.from, to: end.id }]
  }
  return [{ id: 'active-link', from: end.id, to: link.to as LinkPoint }]
}
