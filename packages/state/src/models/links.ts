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
