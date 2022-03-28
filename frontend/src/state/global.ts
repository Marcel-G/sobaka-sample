import { debounce } from 'lodash'
import { navigate } from 'svelte-routing'
import type { Link } from './links'
import links from './links'
import modules, { AnyModule } from './modules'
import { local_storage as local_storage_adapter } from './persist'

export interface Global {
  modules: AnyModule[]
  links: Required<Link>[]
}

export const global_state = () => {
  const save = (): Global => {
    return {
      modules: modules.save(),
      links: links.save()
    }
  }

  const load = (state: Global) => {
    modules.load(state.modules)
    links.load(state.links)
  }

  const fresh: Global = {
    modules: [],
    links: []
  }

  return {
    load,
    save,
    fresh
  }
}

export const init = () => {
  const global = global_state()
  const persistant = local_storage_adapter(global)
  let current_id: string

  const set_current_id = (id: string) => {
    current_id = id
  }

  const commit = debounce(() => {
    void persistant.save(current_id).then(id => {
      if (id) {
        navigate(`/workspace/${id}`)
      }
    })
  }, 2000)

  const cleanup = [modules.store().subscribe(commit), links.store().subscribe(commit)]

  return {
    set_current_id,
    persistant,
    cleanup: () => {
      cleanup.forEach(fn => {
        fn()
      })
    }
  }
}
