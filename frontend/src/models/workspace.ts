import * as Y from 'yjs'

import syncedStore from '@syncedstore/core'
import { derived, writable, type Readable } from 'svelte/store'

import cloneDeep from 'lodash/cloneDeep'
import { INITIAL_STATE, type ModuleUI } from '../modules'
import { intoReadable } from '../util/store'
import { type SubDocReference } from '../util/subdoc'
import { type Position } from '../@types'
import { SyncedDoc, type Config } from './syncedDoc'
import type { User } from '../context/global'

export interface WorkspaceDoc {
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

type WorkspaceInfo = {
  title: string
}

type WorkspaceStore = {
  info: WorkspaceInfo
  modules: Array<Module>
  links: Array<Required<Link>>
}

const WORKSPACE_STORE_SHAPE = {
  info: {} as WorkspaceInfo,
  modules: [],
  links: []
}

type UserAwareness = {
  user: User
}

export class Workspace extends SyncedDoc<'workspace'> {
  private store: ReturnType<typeof syncedStore<WorkspaceStore>>
  user_store = writable<Record<string, UserAwareness>>({})

  constructor(doc: Y.Doc, config: Config) {
    super('workspace', doc, config)
    this.store = syncedStore(WORKSPACE_STORE_SHAPE, doc)

    this.synced(() => {
      this.migrate()
    })

    const user = { uuid: config.currentUser }
    this.rtc.awareness.setLocalStateField('user', user)
    this.rtc.awareness.on('change', () => {
      this.handleAwarenessChange()
    })
  }

  static create(doc: Y.Doc = new Y.Doc(), config: Config) {
    const workspace = new Workspace(doc, config)
    workspace.create(config.currentUser)
    return workspace
  }

  static fromRef(config: Config, ref?: SubDocReference<Workspace>) {
    return new Workspace(new Y.Doc(ref), config)
  }

  migrate() {
    this.store.info.title ??= 'Untitled Workspace'
  }

  private get storeReactive() {
    return intoReadable(this.store)
  }

  get info(): Readable<WorkspaceInfo> {
    return intoReadable(this.store.info as WorkspaceInfo)
  }

  get links(): Readable<Required<Link>[]> {
    return derived(this.storeReactive, store => store.links)
  }

  get modules(): Readable<Module[]> {
    return derived(this.storeReactive, store => store.modules)
  }

  // TODO: this is a bit messy
  private handleAwarenessChange() {
    const awareness = this.rtc.awareness
    const newState: Record<string, UserAwareness> = {}
    awareness.getStates().forEach((_state, cid: number) => {
      if (cid === awareness.clientID) return
      // TODO: cleaner validation
      if (
        'user' in _state &&
        typeof _state.user === 'object' &&
        'uuid' in _state.user &&
        typeof _state.user.uuid === 'string'
      ) {
        newState[_state.user.uuid] = _state as UserAwareness
      }
    })

    this.user_store.update(() => newState)
  }

  // Module actions
  create_module(type: ModuleUI, position: { x: number; y: number }): string {
    const id = crypto.randomUUID()

    const { modules } = this.store

    if (modules) {
      modules.push({
        id,
        type,
        // TS doesn't know about svelte module imports - https://github.com/sveltejs/svelte/issues/5817

        state: INITIAL_STATE[type],
        position
      })
    }

    return id
  }

  move_module(id: string, x: number, y: number): boolean {
    const { modules } = this.store

    const module = modules.find(byModuleId(id))
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

  remove_module(id: string) {
    const { modules } = this.store

    const index = modules.findIndex(byModuleId(id))
    if (index >= 0) {
      modules.splice(index, 1)
    }
  }

  clone_module(id: string) {
    const { modules } = this.store

    const module = modules.find(byModuleId(id))

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

  // Module selectors
  module_position(id: string): Readable<Position> {
    return derived(intoReadable(this.store.modules), modules => {
      const mod = modules.find(byModuleId(id))
      if (mod) {
        return mod.position
      } else {
        return { x: 0, y: 0 }
      }
    })
  }

  // Link actions
  add_link(link: Link): string {
    const id = crypto.randomUUID()
    const { links } = this.store

    links.push({ id, ...link })

    return id
  }

  remove_link(link_id: string) {
    const { links } = this.store
    const index = links.findIndex(byLinkId(link_id))
    if (index >= 0) {
      links.splice(index, 1)
    }
  }
}

const byModuleId = (id: string) => (module: Module) => module.id === id
const byLinkId = (id: string) => (link: Required<Link>) => link.id === id
