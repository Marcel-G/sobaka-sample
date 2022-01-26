import { merge, omit, __ as _ } from 'lodash/fp'
import { AbstractNode, AnyInput, NodeType } from 'sobaka-sample-audio-worklet/dist/lib'
import { get, Readable, writable, Writable } from 'svelte/store'
import links, { is_fully_linked, Link } from './links'

enum PlugType {
  Input,
  Output
}

export interface PlugContext {
  type: PlugType
  node: Readable<Element>
  module: AbstractNode<NodeType>
  input?: AnyInput
}

type PlugStore = Record<string, PlugContext>

const init = () => {
  const plug_store = writable<PlugStore>({})
  // @todo move together with plug calls?
  const make = (module: string, name: string) => {
    const active_link = links.active_link_store()
    const id = `${module}/${name}`
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
    name: string,
    for_module: AbstractNode<NodeType>,
    node: Writable<Element>,
    for_input?: AnyInput
  ) => {
    const id = `${module}/${name}`
    if (get(plug_store)[id]) {
      throw new Error(`Plug: '${id}' already exists. Please use unique naming`)
    }
    plug_store.update(
      merge<Partial<PlugStore>>(_, {
        [id]: {
          node,
          module: for_module,
          input: for_input,
          type: !for_input ? PlugType.Output : PlugType.Input
        }
      })
    )
  }

  const remove = (module: string, name: string) => {
    const id = `${module}/${name}`
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
