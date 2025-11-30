export interface Link {
  // Unique ID for this link
  id?: string
  // Plug ID from which to link.
  from: LinkPoint
  // Plug ID to link to.
  to: LinkPoint
}

export interface LinkPoint {
  moduleId: string,
  routeName: string,
}

export enum PlugType {
  Input = "in",
  Output = "out",
  // TODO: mixer represents a link to the master mixer
  //       These should have as special wire treatment that indicates
  Mixer = "mixer",
  Param = "param"
}

export const isFullyLinked = (link: Partial<Link> | null): link is Link => {
  return Boolean(link?.from && link?.to)
}

/**
 * Serialize a LinkPoint to a stable string key for use in Maps/Sets
 * Format: "moduleId/routeName"
 */
export const linkPointToKey = (point: LinkPoint): string => {
  return `${point.moduleId}/${point.routeName}`
}

/**
 * Deserialize a string key back to a LinkPoint
 */
export const keyToLinkPoint = (key: string): LinkPoint => {
  const [moduleId, routeName] = key.split('/')
  return { moduleId, routeName }
}

/**
 * Compare two LinkPoints for equality
 */
export const linkPointsEqual = (a: LinkPoint, b: LinkPoint): boolean => {
  return a.moduleId === b.moduleId && a.routeName === b.routeName
}
