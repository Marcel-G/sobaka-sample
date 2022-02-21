import { concat, filter, isMatch, merge, negate, __ as _ } from 'lodash/fp'
import { get, writable } from 'svelte/store'
import { ModuleUI } from '../modules'
import { replace } from './utils'

export interface Module<T extends ModuleUI> {
  id: string
  type: T
  state?: Record<string, unknown>
  position: {
    x: number
    y: number
  }
}

export type AnyModule = Module<ModuleUI>

const init = () => {
  const module_state = writable<AnyModule[]>([])
  const move = (module: string, x: number, y: number): boolean => {
    module_state.update(
      replace<AnyModule>(
        isMatch({ id: module }),
        merge<Partial<AnyModule>>(_, { position: { x, y } })
      )
    )

    return true
  }

  const create = (type: ModuleUI): string => {
    const id = Math.random().toString(36).substr(2, 9)

    module_state.update(
      concat(_, {
        id,
        type,
        position: { x: 5, y: 5 }
      })
    )

    return id
  }

  const get_module = (module: string): Module<ModuleUI> | null => {
    return get(module_state).find(isMatch({ id: module })) || null
  }

  const update_state = (
    module: string,
    state_fn: (state: Record<string, unknown>) => Record<string, unknown>
  ) => {
    module_state.update(
      replace<AnyModule>(isMatch({ id: module }), module => ({
        ...module,
        state: state_fn(module.state || {})
      }))
    )
  }

  const remove = (module: string) => {
    module_state.update(filter<AnyModule>(negate(isMatch({ id: module }))))
  }

  const store = () => {
    return module_state
  }

  const save = () => {
    return get(module_state)
  }

  const load = (modules: Module<ModuleUI>[]) => {
    module_state.set(modules)
  }

  return {
    get_module,
    update: update_state,
    remove,
    store,
    create,
    move,
    load,
    save
  }
}

export default init()
