import { concat, filter, isMatch, merge, negate, omit, __ as _ } from 'lodash/fp'
import { ModuleType, AbstractModule } from 'sobaka-sample-web-audio/dist/lib'
import { Input } from 'sobaka-sample-web-audio/dist/lib/modules'
import { get, Readable, writable } from 'svelte/store'
import { replace } from './utils'

// Context stores some ephemeral data that needs to be created
// on moduel initialisation
type InputNodeStorage<T extends ModuleType> = {
  [M in Input<T>]?: Readable<Element>
}
export interface ModuleContext<T extends ModuleType> {
  module?: AbstractModule<T> // @todo maybe needs to be [module_id, 'output', node], [module_id, Input<T>, node].. etc
  output?: Readable<Element>
  input?: InputNodeStorage<T>
}
export interface Module<T extends ModuleType> {
  id: string
  type: T
  context?: ModuleContext<T>
  state?: Record<string, any> // @todo can this be more specific
  position: {
    x: number
    y: number
  }
}

export type AnyModule = Module<ModuleType>

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

  const create = (type: ModuleType): string => {
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

  const get_module = (module: string): Module<ModuleType> | null => {
    return get(module_state).find(isMatch({ id: module })) || null
  }

  const register = (module: string, module_instance: AbstractModule<ModuleType>) => {
    module_state.update(
      replace<AnyModule>(
        isMatch({ id: module }),
        merge<Partial<AnyModule>>(_, { context: { module: module_instance } })
      )
    )
  }

  const update_state = <T extends ModuleType>(
    module: string,
    state: Record<string, any>
  ) => {
    module_state.update(
      replace<AnyModule>(isMatch({ id: module }), merge<Partial<Module<T>>>(_, { state }))
    )
  }

  const remove = (module: string) => {
    module_state.update(filter<AnyModule>(negate(isMatch({ id: module }))))
  }

  const store = () => {
    return module_state
  }

  const save = () => {
    return get(module_state).map(omit('context'))
  }

  const load = (modules: Module<ModuleType>[]) => {
    module_state.set(modules)
  }

  return {
    get_module,
    update: update_state,
    remove,
    register,
    store,
    create,
    move,
    load,
    save
  }
}

export default init()
