import { INITIAL_STATE, ModuleUI } from '../modules'
import { store as plug_store, PlugContext } from './plugs'
import { derived, get, Readable, writable } from 'svelte/store'
import syncedStore, { getYjsDoc } from '@syncedstore/core'
import { DocTypeDescription } from '@syncedstore/core/types/doc'
import { svelteSyncedStore } from '@syncedstore/svelte'
import { IndexeddbPersistence } from 'y-indexeddb'
import {
  load_from_remote as _load_from_remote,
  save_draft,
  save_to_remote as _save_to_remote
} from '../worker/state'
import { goto } from '$app/navigation'
import { WebrtcProvider } from 'y-webrtc'
import { Position } from '../@types'
import { cloneDeep, throttle } from 'lodash'
import { get_user, User } from '../worker/user'

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

type UserAwareness = {
  user: User
  mouse?: Position
}

export const is_fully_linked = (link: Partial<Link> | null): link is Link => {
  return Boolean(link?.from && link?.to)
}

type PeersEvent = {
  added: string[]
  removed: string[]
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
  const actie_link_store = writable<Partial<Link> | null>(null)

  const load_from_remote = async (remote_workspace: string) => {
    await _load_from_remote(remote_workspace, doc)

    doc.once('update', async () => {
      const new_workspace = await save_draft(doc)

      const meta = get(store).meta
      meta.parent = remote_workspace
      meta.createdAt ??= new Date().toISOString()
      // @todo -- update updatedAt when the document changes
      meta.updatedAt = new Date().toISOString()

      goto(`/workspace/draft/${new_workspace}`)
    })
  }

  const load_from_local = async (local_workspace: string) => {
    const provider = new IndexeddbPersistence(local_workspace, doc)
    await provider.whenSynced

    const meta = get(store).meta
    if (!meta.title) {
      meta.title = 'New Workspace'
    }
    meta.createdAt ??= new Date().toISOString()
    meta.updatedAt ??= new Date().toISOString()
  }

  const user_store = writable<Record<string, UserAwareness>>({})

  const get_user_store = () => {
    return user_store
  }

  const wip_connect_live = async (local_workspace: string) => {
    const provider = new WebrtcProvider(local_workspace, doc, {
      signaling: ['wss://signaling.test.marcelgleeson.com']
    })

    const awareness = provider.awareness

    const current_user = get_user()!

    awareness.setLocalStateField('user', current_user)

    const update_mouse_pos = ({ x, y }: Position) => {
      awareness.setLocalStateField('mouse', { x, y })
    }

    let lastX: number
    let lastY: number

    const mousemoveHandler = throttle((event: MouseEvent) => {
      const x = event.clientX
      const y = event.clientY

      // Check if the mouse has moved since the last update
      if (x !== lastX || y !== lastY) {
        update_mouse_pos({ x, y })
      }
    }, 250)

    document.addEventListener('mousemove', mousemoveHandler)

    // Remove mouse movement listener when YJS document is destroyed
    doc.on('destroy', () => {
      document.removeEventListener('mousemove', mousemoveHandler)
    })

    awareness.on('change', (state: PeersEvent) => {
      // console.log('🥁', state)
      // for (const peer of state.added) {
      //   // const s = awareness.getStates(peer)
      //   // console.log('🤔', s, peer)
      //   // const p = PeerId.createFromB58String()
      // }
      const newState: Record<string, UserAwareness> = {}
      awareness.getStates().forEach((_state, cid: number) => {
        if (cid === awareness.clientID) return

        const state = _state as UserAwareness
        newState[state.user.name] = state
      })

      user_store.update(() => newState)
    })
  }

  const save_to_remote = async () => {
    const cid = await _save_to_remote(doc)
    goto(`/workspace/${cid}`)
  }

  // Module actions
  const create_module = (type: ModuleUI, position: { x: number; y: number }): string => {
    const id = crypto.randomUUID()

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
    const { modules } = get(store)
    const module = modules.find(module => module.id === id)
    if (module) {
      module.position.x = x
      module.position.y = y

      // Make the module the last in the list so that it's rendered on top.
      const index = modules.indexOf(module)
      if (index !== modules.length - 1) {
        // clone the module so it can be re-inserted without "Not supported: reassigning object that already occurs in the tree."
        // https://github.com/YousefED/SyncedStore/issues/87#issue-1487084868
        const copy = cloneDeep(module)

        modules.splice(index, 1)
        modules.push(copy)
      }
    }

    return true
  }

  const remove_module = (id: string) => {
    const { modules } = get(store)
    const index = modules.findIndex(module => module.id === id)
    if (index >= 0) {
      modules.splice(index, 1)
    }
  }

  const clone_module = (id: string) => {
    const { modules } = get(store)

    const module = modules.find(module => module.id === id)

    if (module) {
      modules.push({
        ...cloneDeep(module),
        id: crypto.randomUUID(),
        position: {
          x: module.position.x + 1,
          y: module.position.y + 1
        }
      })
    }
  }

  const module_position = (id: string): Readable<Position> => {
    return derived(store, ({ modules }) => {
      const mod = modules.find(module => module.id === id)
      if (mod) {
        return mod.position
      } else {
        return { x: 0, y: 0 }
      }
    })
  }

  // Link actions
  const add_link = (link: Link): string => {
    const id = crypto.randomUUID()
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

  const cleanup = () => {
    doc.destroy()
  }

  return {
    store,
    cleanup,
    get_user_store,
    wip_connect_live,
    save_to_remote,
    load_from_remote,
    load_from_local,
    create_module,
    move_module,
    remove_module,
    clone_module,
    module_position,
    add_link,
    remove_link,
    get_active_link_substore,
    get_active_link_position,
    get_link_positions
  }
}

export type WorkspaceStore = ReturnType<typeof workspace>
