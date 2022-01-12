import { concat, filter, isMatch, negate } from 'lodash/fp'
import { get, writable } from 'svelte/store'

export interface Link {
  // Unique ID for this link
  id?: string
  // Plug ID from which to link.
  from: string
  // Plug ID to link to.
  to: string
}

export const is_fully_linked = (link: Partial<Link> | null): link is Link => {
  return Boolean(link?.from && link?.to)
}

const init = () => {
  const active_link = writable<Partial<Link> | null>(null)
  const link_state = writable<Required<Link>[]>([])

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
