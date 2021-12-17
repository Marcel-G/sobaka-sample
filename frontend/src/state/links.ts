import type { InputTypeDTO } from 'sobaka-sample-web-audio'
import { get, writable } from 'svelte/store'
import modules from './modules'

export interface Link {
  from: string
  to: string
  to_input_type: InputTypeDTO
}

const init = () => {
  const active_link = writable<Partial<Link> | null>(null)
  const link_state = writable<Link[]>([])

  // Clear out links for removed items
  // @todo Probably can be done less frequently than this
  modules.store().subscribe(modules => {
    link_state.update(links =>
      links.filter(
        link =>
          modules.find(({ id }) => id === link.from) &&
          modules.find(({ id }) => id === link.to)
      )
    )
  })

  const active_link_store = () => {
    return active_link
  }

  const store = () => {
    return link_state
  }

  const add = (link: Link) => {
    link_state.update(links => [...links, link])
  }

  const remove = (link: Link) => {
    link_state.update(links =>
      links.filter(
        ({ from, to, to_input_type }) =>
          !(link.from === from && link.to === to && link.to_input_type === to_input_type)
      )
    )
  }

  const save = () => {
    return get(link_state)
  }

  const load = (links: Link[]) => {
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
