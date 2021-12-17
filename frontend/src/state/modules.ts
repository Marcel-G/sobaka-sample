import type { ModuleType } from 'sobaka-sample-web-audio'
import { get, Readable, writable } from 'svelte/store'

// Context stores some ephemeral data that needs to be created
// on moduel initialisation
export interface ModuleContext {
  module_id: number
  output_node?: Readable<Element>
  input_nodes: Record<string, Readable<Element>>
}
export interface Module {
  id: string
  type: ModuleType
  context?: ModuleContext
  state?: Record<string, any>
  position: {
    x: number
    y: number
  }
}

const init = () => {
  const module_state = writable<Module[]>([])
  const move = (module: string, x: number, y: number): boolean => {
    const state = get(module_state)

    const module_index = state.findIndex(({ id }) => id === module)

    if (module_index < 0) {
      return false
    }

    // @todo box check

    module_state.update(state => [
      ...state.slice(0, module_index),
      {
        ...state[module_index],
        position: { x, y }
      },
      ...state.slice(module_index + 1)
    ])

    return true
  }

  const create = (type: ModuleType): string => {
    const id = Math.random().toString(36).substr(2, 9)
    module_state.update(state => [
      ...state,
      {
        id,
        type,
        position: { x: 5, y: 5 }
      }
    ])

    return id
  }

  const get_module = (module: string): Module | null => {
    const state = get(module_state)
    const module_index = state.findIndex(({ id }) => id === module)

    if (module_index < 0) return null

    return state[module_index]
  }

  const register = (module: string, context: ModuleContext) => {
    const state = get(module_state)
    const module_index = state.findIndex(({ id }) => id === module)

    module_state.update(state => [
      ...state.slice(0, module_index),
      {
        ...state[module_index],
        context
      },
      ...state.slice(module_index + 1)
    ])
  }

  const update = (module: string, new_state: any) => {
    const state = get(module_state)
    const module_index = state.findIndex(({ id }) => id === module)

    if (module_index < 0) {
      return false
    }

    module_state.update(state => [
      ...state.slice(0, module_index),
      {
        ...state[module_index],
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        state: new_state
      },
      ...state.slice(module_index + 1)
    ])
  }

  const remove = (module: string) => {
    module_state.update(state => state.filter(({ id }) => id !== module))
  }

  const store = () => {
    return module_state
  }

  const save = () => {
    return get(module_state).map(({ context, ...module }) => module) // @todo use ramda?
  }

  const load = (modules: Module[]) => {
    module_state.set(modules)
  }

  return {
    get_module,
    update,
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
