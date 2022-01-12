import { debounce } from 'lodash'
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

  return {
    load,
    save
  }
}

export const init = () => {
  const global = global_state()
  const persistant = local_storage_adapter(global)

  const commit = debounce(() => {
    const id = persistant.save()
    if (id) {
      history.pushState({}, '', `/workspace/${id}`)
    }
  }, 2000)

  const cleanup = [modules.store().subscribe(commit), links.store().subscribe(commit)]

  return {
    persistant,
    cleanup: () => {
      cleanup.forEach(fn => {
        fn()
      })
    }
  }
}
