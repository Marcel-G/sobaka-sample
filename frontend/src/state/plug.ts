import { isMatch, merge, __ as _ } from 'lodash/fp'
import { AnyInput } from 'sobaka-sample-web-audio/dist/lib'
import { get, Writable } from 'svelte/store'
import links, { is_fully_linked, Link } from './links'
import modules, { AnyModule } from './modules'
import { replace } from './utils'

const init = () => {
  // @todo move together with plug calls?
  const make = (module: string, to_input: AnyInput | null) => {
    const active_link = links.active_link_store()
    if (to_input === null) {
      active_link.update(merge<Partial<Link>>(_, { from: module }))
    } else {
      active_link.update(merge<Partial<Link>>(_, { to: module, to_input }))
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
    for_input: AnyInput | null,
    node: Writable<Element>
  ) => {
    const module_state = modules.store()

    if (for_input == null) {
      module_state.update(
        replace<AnyModule>(
          isMatch({ id: module }),
          merge<Partial<AnyModule>>(_, { context: { output: node } })
        )
      )
    } else {
      module_state.update(
        replace<AnyModule>(
          isMatch({ id: module }),
          merge<Partial<AnyModule>>(_, { context: { input: { [for_input]: node } } })
        )
      )
    }
  }

  return {
    register,
    make
  }
}

export default init()
