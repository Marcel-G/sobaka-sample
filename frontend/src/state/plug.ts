import { merge, omit, __ as _ } from 'lodash/fp'
import { AbstractModule, NodeType, In, Out } from 'sobaka-sample-audio-worklet'
import { get, Readable, writable, Writable } from 'svelte/store'
import links, { is_fully_linked, Link } from './links'

export enum PlugType {
  Input,
  Output
}

export interface PlugContext {
  type: PlugType
  node: Readable<Element>
  module: AbstractModule<NodeType>
  id: number
}

type PlugStore = Record<string, PlugContext>

const init = () => {
  const plug_store = writable<PlugStore>({})
  // @todo move together with plug calls?
  const make = (module: string, plug_type: PlugType, plug_id: number) => {
    const id = `${module}/${plug_type == PlugType.Input ? In(plug_id) : Out(plug_id)}`
    const active_link = links.active_link_store()

    const plug_context = get(plug_store)[id]

    if (plug_context.type == PlugType.Input) {
      active_link.update(merge<Partial<Link>>(_, { from: id }))
    } else {
      active_link.update(merge<Partial<Link>>(_, { to: id }))
    }

    const link = get(active_link)

    if (is_fully_linked(link)) {
      links.add(link)
      active_link.set(null)
    }
  }

  // move together with plug calls?
  const register = (
    module: string,
    for_module: AbstractModule<NodeType>,
    node: Writable<Element>,
    plug_type: PlugType,
    plug_id: number
  ) => {
    const id = `${module}/${plug_type == PlugType.Input ? In(plug_id) : Out(plug_id)}`

    if (get(plug_store)[id]) {
      throw new Error(`Plug: '${id}' already exists. Please use unique naming`)
    }
    plug_store.update(
      merge<Partial<PlugStore>>(_, {
        [id]: {
          node,
          module: for_module,
          type: plug_type,
          id: plug_id
        }
      })
    )
  }

  const remove = (module: string, plug_type: PlugType, plug_id: number) => {
    const id = `${module}/${plug_type == PlugType.Input ? In(plug_id) : Out(plug_id)}`

    links
      .store()
      .update(links => links.filter(link => !(link.to == id || link.from === id)))
    plug_store.update(omit(id))
  }

  const store = () => {
    return plug_store
  }

  return {
    remove,
    store,
    register,
    make
  }
}

export default init()
