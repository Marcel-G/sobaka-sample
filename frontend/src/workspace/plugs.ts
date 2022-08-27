import { writable } from '@crikey/stores-immer'
import { selectable } from '@crikey/stores-selectable'
import type { AbstractModule, NodeType } from 'sobaka-sample-audio-worklet'
import { get, Readable, Writable } from 'svelte/store'
import { is_fully_linked, WorkspaceStore } from './state'

// @todo export these from sobaka-sample-audio-worklet without ssr breaking
const In = (n: number) => `in-${n}`
const Out = (n: number) => `out-${n}`

export enum PlugType {
  Input,
  Output
}

export interface PlugContext {
  type: PlugType
  node: Readable<Element | null>
  module: AbstractModule<NodeType>
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
    const id = `${module}/${plug_type == PlugType.Input ? In(plug_id) : Out(plug_id)}`
    const active_link = space.get_active_link_substore()

    const plug_context = get(store)[id]

    if (plug_context.type == PlugType.Input) {
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
    for_module: AbstractModule<NodeType>,
    node: Writable<Element | null>,
    plug_type: PlugType,
    plug_id: number
  ) => {
    const id = `${module}/${plug_type == PlugType.Input ? In(plug_id) : Out(plug_id)}`

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
    const id = `${module}/${plug_type == PlugType.Input ? In(plug_id) : Out(plug_id)}`

    space.remove_link(id)

    // @todo
    // links
    //   .store()
    //   .update(links => links.filter(link => !(link.to == id || link.from === id)))

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
