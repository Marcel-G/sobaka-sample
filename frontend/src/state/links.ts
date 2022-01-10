import { concat, filter, isMatch, negate } from 'lodash/fp'
import { AnyInput } from 'sobaka-sample-web-audio/dist/lib'
import { get, writable } from 'svelte/store'
import modules from './modules'

export interface Link {
  id?: string
  from: string
  to: string
  to_input: AnyInput
}

export const is_fully_linked = (link: Partial<Link> | null): link is Link => {
  return Boolean(link?.from && link?.to && link?.to_input)
}

const init = () => {
  const active_link = writable<Partial<Link> | null>(null)
  const link_state = writable<Required<Link>[]>([])

  // Clear out links for removed items
  // @todo Probably can be done less frequently than this
  modules.store().subscribe(modules => {
    link_state.update(
      filter<Required<Link>>(link =>
        Boolean(
          modules.find(isMatch({ id: link.to })) &&
            modules.find(isMatch({ id: link.from }))
        )
      )
    )
  })

  const active_link_store = () => {
    return active_link
  }

  const store = () => {
    return link_state
  }

  const add = (link: Link): string => {
    const id = Math.random().toString(36).substr(2, 9)

    link_state.update(concat({ ...link, id }))

    return id
  }

  const remove = (link_id: string) => {
    link_state.update(filter<Required<Link>>(negate(isMatch({ id: link_id }))))
  }

  const save = () => {
    return get(link_state)
  }

  const load = (links: Required<Link>[]) => {
    link_state.set(links)
    active_link.set(null)
  }

  return {
    add,
    remove,
    active_link_store,
    store,
    load,
    save
  }
}

export default init()
