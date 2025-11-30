export interface Link {
  // Unique ID for this link
  id?: string
  // Plug ID from which to link.
  from: string
  // Plug ID to link to.
  to: string
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

export const plugTypeFromStr = (str: string) => {
  switch (str) {
    case 'in':
      return PlugType.Input
    case 'out':
      return PlugType.Output
    case 'mixer':
      return PlugType.Mixer
    case 'param':
      return PlugType.Param
    default:
      throw new Error('Invalid plug type')
  }
}

export const parsePlugId = (id: string) => {
  const input = id.split('/')
  if (input.length !== 3) throw new Error('Invalid plug id')
  const [moduleId, _type, _n] = input
  return ({
    moduleId,
    type: plugTypeFromStr(_type),
    connectIndex: parseInt(_n, 10)
  })
}

export const createPlugId = (moduleId: string, type: PlugType, n: number) =>
  [moduleId, type, n].join('/')

// Snake case aliases for backward compatibility
export const is_fully_linked = isFullyLinked
export const plug_type = (plugId: string): PlugType => {
  const parsed = parsePlugId(plugId)
  return parsed.type
}
