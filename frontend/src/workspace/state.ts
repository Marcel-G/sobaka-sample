import { INITIAL_STATE, ModuleUI } from '../modules'
import { subscribe_patches, SubStore } from '../utils/patches'
import { derived, writable } from '@crikey/stores-immer'
import { store as plug_store, PlugContext } from './plugs'
import { WorkspaceDocument } from '../worker/persistence'
import { selectable } from '@crikey/stores-selectable'
import type { Operation } from 'fast-json-patch'
import { pick } from 'lodash'
import { Entity } from '../@types/entity'

export interface Workspace {
  id: string
  title: string
  modules: Entity<Module>
  links: Entity<Required<Link>>

  active_link: Partial<Link> | null

  // Subscribe to workspace changes in modules and links
  undoStack: unknown[]
  redoStack: unknown[]
}

export interface Module {
  id: string
  type: ModuleUI
  state: Record<string, unknown> // Needs to be mutable from inside a module
  position: {
    x: number
    y: number
  }
}
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

export const workspace = (initialState: Workspace | WorkspaceDocument) => {
  const store = selectable(
    writable<Workspace>({
      active_link: null,
      undoStack: [],
      redoStack: [],
      ...pick(initialState, 'id', 'title', 'modules', 'links')
    })
  )

  const modules = store.select(workspace => workspace.modules)
  const links = store.select(workspace => workspace.links)

  // Module actions
  const create_module = (type: ModuleUI, position: { x: number; y: number }): string => {
    const id = Math.random().toString(36).substr(2, 9)

    store.update(workspace => {
      workspace.modules.ids.push(id)
      workspace.modules.entities[id] = {
        id,
        type,
        // TS doesn't know about svelte module imports - https://github.com/sveltejs/svelte/issues/5817
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        state: INITIAL_STATE[type],
        position
      }

      return workspace
    })

    return id
  }

  const move_module = (module: string, x: number, y: number): boolean => {
    // @todo check if module exists
    modules.update(modules => {
      const index = modules.ids.indexOf(module)
      if (index !== -1) {
        // Move the module index to the end so that it is rendered on top of all other modules
        modules.ids.splice(index, 1)
        modules.ids.push(module)

        modules.entities[module].position.x = x
        modules.entities[module].position.y = y
      }

      return modules
    })

    return true
  }

  const remove_module = (module: string) => {
    store.update(workspace => {
      const index = workspace.modules.ids.findIndex(id => id === module)
      if (index >= 0) {
        workspace.modules.ids.splice(index, 1)
        delete workspace.modules.entities[module]
      }

      return workspace
    })
  }

  const clone_module = (module_id: string) => {
    const id = Math.random().toString(36).substr(2, 9)
    store.update(workspace => {
      const module = workspace.modules.entities[module_id]
      if (module) {
        workspace.modules.ids.push(id)
        workspace.modules.entities[id] = {
          ...module,
          id,
          position: {
            x: module.position.x + 1,
            y: module.position.y + 1
          }
        }

        return workspace
      }
    })
  }

  // Module Selectors

  const list_modules = (): SubStore<string[]> => {
    return modules.select(modules => modules.ids)
  }

  const get_module_substore = (module: string): SubStore<Module> => {
    return modules.select(modules => modules.entities[module])
  }

  const get_module_state_substore = (module: string): SubStore<Module['state']> => {
    return get_module_substore(module).select(state => state.state)
  }

  // Link actions

  const add_link = (link: Link): string => {
    const id = Math.random().toString(36).substr(2, 9)
    links.update(links => {
      links.ids.push(id)
      links.entities[id] = { id, ...link }
      return links
    })

    return id
  }

  const remove_link = (link_id: string) => {
    links.update(links => {
      const index = links.ids.findIndex(id => id === link_id)
      if (index >= 0) {
        links.ids.splice(index, 1)
        delete links.entities[link_id]
      }

      return links
    })
  }

  // Link Selectors

  const list_links = (): SubStore<string[]> => {
    return links.select(links => links.ids)
  }

  const get_link_substore = (link_id: string): SubStore<Required<Link>> => {
    return links.select(links => links.entities[link_id])
  }

  const get_active_link_substore = () => {
    return store.select(workspace => workspace.active_link)
  }

  const get_active_link_position = () => {
    return derived([get_active_link_substore(), plug_store], ([link, plugs]) => {
      if (!link || (link?.from && link?.to)) return [null, null]
      return [link.to ? plugs[link.to] : null, link.from ? plugs[link.from] : null]
    })
  }

  const get_link_positions = () => {
    return derived([links, plug_store], ([links, plugs]) =>
      Object.values(links.entities)
        .map(link => [plugs[link.to], plugs[link.from], link])
        .filter((link): link is [PlugContext, PlugContext, Required<Link>] =>
          link.every(Boolean)
        )
    )
  }

  const update_title = (title: string) => {
    store.update(s => {
      s.title = title
      return s
    })
  }

  const subscribe_changes = (cb: (change: Operation[]) => void): (() => void) => {
    return subscribe_patches(store, cb, ['id', 'active_link', 'undoStack', 'redoStack'])
  }

  return {
    id: initialState.id,
    subscribe_changes,
    create_module,
    move_module,
    remove_module,
    clone_module,
    list_modules,
    get_module_substore,
    get_module_state_substore,
    update_title,
    add_link,
    remove_link,
    list_links,
    get_link_substore,
    get_active_link_substore,
    get_active_link_position,
    get_link_positions
  }
}

export type WorkspaceStore = ReturnType<typeof workspace>
