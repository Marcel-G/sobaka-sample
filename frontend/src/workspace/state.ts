import { INITIAL_STATE, ModuleUI } from '../modules'
import { store as plug_store, PlugContext } from './plugs'
import { derived, get, Readable, writable } from 'svelte/store'
import syncedStore, { getYjsDoc } from '@syncedstore/core'
import { DocTypeDescription } from '@syncedstore/core/types/doc'
import { svelteSyncedStore } from '@syncedstore/svelte'
import { IndexeddbPersistence } from 'y-indexeddb'
import {
  create_db_name,
  load_from_remote as _load_from_remote,
  save_to_remote as _save_to_remote
} from '../worker/state'
import { goto } from '$app/navigation'

export type WorkspaceMeta = {
  title: string
  parent?: string
  createdAt: string
  updatedAt: string
}

export interface WorkspaceDoc extends DocTypeDescription {
  meta: WorkspaceMeta
  modules: Array<Module>
  links: Array<Required<Link>>
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

export const workspace = () => {
  const workpaceDoc = syncedStore<WorkspaceDoc>({
    meta: {} as WorkspaceMeta,
    modules: [],
    links: []
  })

  const doc = getYjsDoc(workpaceDoc)
  const store = svelteSyncedStore(workpaceDoc)

  // @todo -- sync per user active links
  const actie_link_store = writable<Partial<Link>>({})

  const load_from_remote = async (remote_workspace: string) => {
    await _load_from_remote(remote_workspace, doc)

    doc.once('update', async () => {
      const new_workspace = crypto.randomUUID()

      const provider = new IndexeddbPersistence(create_db_name(new_workspace), doc)
      await provider.whenSynced

      const meta = get(store).meta
      meta.parent = remote_workspace
      meta.createdAt ??= new Date().toISOString()
      // @todo -- update updatedAt when the document changes
      meta.updatedAt = new Date().toISOString()

      goto(`/workspace/draft/${new_workspace}`)
    })
  }

  const load_from_local = async (local_workspace: string) => {
    const provider = new IndexeddbPersistence(create_db_name(local_workspace), doc)
    await provider.whenSynced

    const meta = get(store).meta
    if (!meta.title) {
      meta.title = 'New Workspace'
    }
    meta.createdAt ??= new Date().toISOString()
    meta.updatedAt ??= new Date().toISOString()
  }

  const save_to_remote = async () => {
    const cid = await _save_to_remote(doc)
    goto(`/workspace/${cid}`)
  }

  // Module actions
  const create_module = (type: ModuleUI, position: { x: number; y: number }): string => {
    const id = Math.random().toString(36).substr(2, 9)

    const workspace = get(store)

    if (workspace.modules) {
      workspace.modules.push({
        id,
        type,
        // TS doesn't know about svelte module imports - https://github.com/sveltejs/svelte/issues/5817
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        state: INITIAL_STATE[type],
        position
      })
    }

    return id
  }

  const move_module = (id: string, x: number, y: number): boolean => {
    // @todo check if module exists
    const { modules } = get(store)
    const module = modules.find(module => module.id === id)
    if (module) {
      const index = modules.indexOf(module)

      module.position.x = x
      module.position.y = y

      // Move the module index to the end so that it is rendered on top of all other modules
      // modules.splice(index, 1)
      // modules.push(module)
    }

    return true
  }

  // @todo -- this does not work
  const remove_module = (id: string) => {
    const { modules } = get(store)
    const index = modules.findIndex(module => module.id === id)
    if (index >= 0) {
      modules.splice(index, 1)
    }
  }

  // @todo -- clone does not work properly
  const clone_module = (id: string) => {
    const new_id = Math.random().toString(36).substr(2, 9)
    const { modules } = get(store)

    const module = modules.find(module => module.id === id)

    if (module) {
      const new_module = {
        ...module,
        id: new_id,
        position: {
          x: module.position.x + 1,
          y: module.position.y + 1
        }
      }
      modules.push(new_module)
    }
  }

  // Module Selectors

  const list_modules = (): Readable<string[]> => {
    return derived(store, ({ modules }) => modules.map(({ id }) => id))
  }

  const get_module_substore = (id: string): Readable<Module> => {
    return derived(store, ({ modules }) => {
      const module = modules.find(module => module.id === id)
      if (!module) throw new Error(`Module ${id} not found`)

      return module
    })
  }

  const get_module_state_substore = (id: string): Readable<Module['state']> => {
    return derived(get_module_substore(id), module => module.state)
  }

  // Link actions

  const add_link = (link: Link): string => {
    const id = Math.random().toString(36).substr(2, 9)
    const { links } = get(store)

    links.push({ id, ...link })

    return id
  }

  const remove_link = (link_id: string) => {
    const { links } = get(store)
    const index = links.findIndex(link => link.id === link_id)
    if (index >= 0) {
      links.splice(index, 1)
    }
  }

  // Link Selectors

  const list_links = (): Readable<string[]> => {
    return derived(store, ({ links }) => links.map(({ id }) => id))
  }

  const get_link_substore = (link_id: string): Readable<Required<Link> | undefined> => {
    return derived(store, ({ links }) => {
      return links.find(link => link.id === link_id)
    })
  }

  const get_active_link_substore = () => {
    return actie_link_store // @todo
  }

  const get_active_link_position = () => {
    return derived([get_active_link_substore(), plug_store], ([link, plugs]) => {
      if (!link || (link?.from && link?.to)) return [null, null]
      return [link.to ? plugs[link.to] : null, link.from ? plugs[link.from] : null]
    })
  }

  const get_link_positions = () => {
    return derived([store, plug_store], ([{ links }, plugs]) =>
      Object.values(links)
        .map(link => [plugs[link.to], plugs[link.from], link])
        .filter((link): link is [PlugContext, PlugContext, Required<Link>] =>
          link.every(Boolean)
        )
    )
  }

  const update_title = (title: string) => {
    const workspace = get(store)
    workspace.meta.title = title
  }

  const cleanup = () => {
    doc.destroy()
  }

  return {
    store,
    cleanup,
    save_to_remote,
    load_from_remote,
    load_from_local,
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
