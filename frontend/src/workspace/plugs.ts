import { writable } from '@crikey/stores-immer'
import { selectable } from '@crikey/stores-selectable'
import { get, Readable, Writable } from 'svelte/store'
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

const to_strong = (type: PlugType, n: number) => {
  switch (type) {
    case PlugType.Input: return In(n);
    case PlugType.Output: return Out(n);
    case PlugType.Param: return Param(n); // @todo -- module type can be AudioParam
  }
}

export interface PlugContext {
  type: PlugType
  node: Readable<Element | null>
  module: AudioNode | AudioParam
  id: number
}

export const store = selectable(writable<Record<string, PlugContext>>({}))

const init = () => {
  // @todo space arg is a bit awkward here
  const make = (
    space: WorkspaceStore,
    module: string,
    plug_type: PlugType,
    plug_id: number
  ) => {
    const id = `${module}/${to_strong(plug_type, plug_id)}`
    const active_link = space.get_active_link_substore()

    const plug_context = get(store)[id]

    if ([PlugType.Input, PlugType.Param].includes(plug_context.type)) {
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
  const register = (
    module: string,
    for_module: AudioNode | AudioParam,
    node: Writable<Element | null>,
    plug_type: PlugType,
    plug_id: number
  ) => {
    const id = `${module}/${to_strong(plug_type, plug_id)}`

    if (get(store)[id]) {
      throw new Error(`Plug: '${id}' already exists. Please use unique naming`)
    }

    if (!for_module) {
      throw new Error('Cannot register without module reference')
    }

    store.update(s => {
      s[id] = {
        node,
        module: for_module,
        type: plug_type,
        id: plug_id
      }

      return s
    })
  }

  const remove = (
    space: WorkspaceStore,
    module: string,
    plug_type: PlugType,
    plug_id: number
  ) => {
    const id = `${module}/${to_strong(plug_type, plug_id)}`

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
