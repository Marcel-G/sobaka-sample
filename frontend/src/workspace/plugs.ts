import { writable } from '@crikey/stores-immer'
import { selectable } from '@crikey/stores-selectable'
import { get, Readable } from 'svelte/store'
import { is_fully_linked, WorkspaceStore } from './state'

// @todo export these from sobaka-sample-audio-worklet without ssr breaking
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

export const store = selectable(writable<Record<string, PlugContext>>({}))

const init = () => {
  // @todo space arg is a bit awkward here
  const make = (space: WorkspaceStore, id: string) => {
    const active_link = space.get_active_link_substore()

    const plug_context = get(store)[id]

    if ([PlugType.Input, PlugType.Param].includes(plug_context.ctx.type)) {
      active_link.update(s => {
        s ??= {}
        s.from = id
        return s
      })
    } else {
      active_link.update(s => {
        s ??= {}
        s.to = id
        return s
      })
    }

    const link = get(active_link)

    if (is_fully_linked(link)) {
      space.add_link(link)
      active_link.set(null)
    }
  }

  // move together with plug calls?
  const register = (module: string, plug_context: PlugContext): string => {
    const id = `${module}/${to_string(plug_context.ctx.type, plug_context.index)}`

    if (get(store)[id]) {
      throw new Error(`Plug: '${id}' already exists. Please use unique naming`)
    }

    store.update(s => {
      s[id] = plug_context

      return s
    })

    return id
  }

  const remove = (space: WorkspaceStore, id: string) => {
    space.remove_link(id)

    // @todo cleanup links when removing link?

    store.update(s => {
      delete s[id]
      return s
    })
  }

  return {
    remove,
    register,
    make
  }
}

export default init()
