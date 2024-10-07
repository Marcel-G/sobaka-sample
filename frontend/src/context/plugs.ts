import { derived, get, Readable, writable } from 'svelte/store'
import { Link, Workspace } from '../models/workspace'

const is_fully_linked = (link: Partial<Link> | null): link is Link => {
  return Boolean(link?.from && link?.to)
}

// @todo export these from sobaka-dsp without ssr breaking
const In = (n: number) => `in-${n}`
const Out = (n: number) => `out-${n}`
const Param = (n: number) => `param-${n}`

export enum PlugType {
  Input,
  Output,
  Param
}

const to_string = (type: PlugType, n: number) => {
  switch (type) {
    case PlugType.Input:
      return In(n)
    case PlugType.Output:
      return Out(n)
    case PlugType.Param:
      return Param(n)
  }
}

export interface ParamContext {
  type: PlugType.Param
  param: AudioParam
}

export interface NodeContext {
  type: PlugType.Input | PlugType.Output
  connectIndex: number
  module: AudioNode
}

export interface PlugContext {
  index: number
  node: Readable<Element | null>
  ctx: ParamContext | NodeContext
}

export const createPlugsContext = (workspace: Workspace) => {
  const plug_store = writable<Record<string, PlugContext>>({})
  const active_link_store = writable<Partial<Link> | null>(null)

  const get_active_link_position = () => {
    return derived([active_link_store, plug_store], ([link, plugs]) => {
      if (!link || (link?.from && link?.to)) return [null, null]
      return [link.to ? plugs[link.to] : null, link.from ? plugs[link.from] : null]
    })
  }

  const get_link_positions = () => {
    return derived([workspace.links, plug_store], ([links, plugs]) =>
      Object.values(links)
        .map(link => [plugs[link.to], plugs[link.from], link])
        .filter((link): link is [PlugContext, PlugContext, Required<Link>] =>
          link.every(Boolean)
        )
    )
  }
  // @todo space arg is a bit awkward here
  const make = (id: string) => {
    const plug_context = get(plug_store)[id]

    if ([PlugType.Input, PlugType.Param].includes(plug_context.ctx.type)) {
      active_link_store.update(s => {
        s ??= {}
        s.from = id
        return s
      })
    } else {
      active_link_store.update(s => {
        s ??= {}
        s.to = id
        return s
      })
    }

    const link = get(active_link_store)

    if (is_fully_linked(link)) {
      workspace.add_link(link)
      active_link_store.set(null)
    }
  }

  // move together with plug calls?
  const register = (module: string, plug_context: PlugContext): string => {
    const id = `${module}/${to_string(plug_context.ctx.type, plug_context.index)}`

    if (get(plug_store)[id]) {
      throw new Error(`Plug: '${id}' already exists. Please use unique naming`)
    }

    plug_store.update(s => {
      s[id] = plug_context

      return s
    })

    return id
  }

  const remove = (id: string) => {
    workspace.remove_link(id)

    // @todo cleanup links when removing link?

    plug_store.update(s => {
      delete s[id]
      return s
    })
  }

  return {
    active_link_store: active_link_store, // TODO: make readable
    get_active_link_position,
    get_link_positions,
    remove,
    register,
    make
  }
}

// TODO: Rename this
export type PlugsContext = ReturnType<typeof createPlugsContext>
