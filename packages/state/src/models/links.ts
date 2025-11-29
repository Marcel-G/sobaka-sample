export interface Link {
  // Unique ID for this link
  id?: string
  // Plug ID from which to link.
  from: string
  // Plug ID to link to.
  to: string
}

const In = (n: number) => `in-${n}`
const Out = (n: number) => `out-${n}`
const Param = (n: number) => `param-${n}`
const Mixer = (n: number) => `mixer-${n}`

export const PlugType = {
  Input: 0,
  Output: 1,
  Mixer: 2,
  Param: 3
} as const

export type PlugType = typeof PlugType[keyof typeof PlugType]

export const is_fully_linked = (link: Partial<Link> | null): link is Link => {
  return Boolean(link?.from && link?.to)
}

const to_string = (type: PlugType, n: number) => {
  switch (type) {
    case PlugType.Input:
      return In(n)
    case PlugType.Output:
      return Out(n)
    case PlugType.Param:
      return Param(n)
    case PlugType.Mixer:
      return Mixer(n)
  }
}

export const plug_type = (id: string) => {
  if (id.includes('in-')) return PlugType.Input
  if (id.includes('out-')) return PlugType.Output
  if (id.includes('param-')) return PlugType.Param
  if (id.includes('mixer-')) return PlugType.Mixer
  throw new Error('Invalid plug id')
}

export const createPlugId = (moduleId: string, type: PlugType, n: number) =>
  moduleId + '/' + to_string(type, n)
