import * as Y from 'yjs'

import syncedStore from '@syncedstore/core'
import { DocTypeDescription, MappedTypeDescription } from '@syncedstore/core/types/doc'
import { derived, get, Readable, writable } from 'svelte/store'

import cloneDeep from 'lodash/cloneDeep'
import { INITIAL_STATE, ModuleUI } from '../modules'
import { intoReadable } from '../util/store'
import { SubDocReference } from '../util/subdoc'
import { Position } from '../@types'
import { IndexeddbPersistence } from 'y-indexeddb'
import { VerifiedRTCProvider } from './rtc'
import { get_user, update_user, User } from './user'

export type WorkspaceMeta = {
  title: string
  createdAt: string
  updatedAt: string
  collaborators: string[]
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

type WorkspaceStore = {
  meta: WorkspaceMeta
  modules: Array<Module>
  links: Array<Required<Link>>
}

type UserAwareness = {
  user: User
}

const WORKSPACE_STORE_SHAPE = {
  meta: {} as WorkspaceMeta,
  modules: [],
  links: []
}

export class Workspace {
  private store: MappedTypeDescription<WorkspaceStore>
  private currentUser = writable<User | null>(get_user())
  user_store = writable<Record<string, UserAwareness>>({})

  private storage: IndexeddbPersistence | null = null
  private rtc: VerifiedRTCProvider | null = null

  constructor(private doc: Y.Doc) {
    this.store = syncedStore(WORKSPACE_STORE_SHAPE, doc)

    this.doc.on('update', (_, origin) => {
      if (origin != null) return
      this.doc.transact(() => {
        this.handleDocumentUpdated()
      }, this)
    })
  }

  static create(doc: Y.Doc = new Y.Doc()) {
    const workspace = new Workspace(doc)
    workspace.populate()
    return workspace
  }

  static fromId(id: string) {
    return new Workspace(new Y.Doc({ guid: id }))
  }

  static fromRef(ref: SubDocReference) {
    return new Workspace(new Y.Doc(ref))
  }

  intoRef(): SubDocReference {
    return { guid: this.doc.guid }
  }

  get id() {
    return this.doc.guid
  }

  private isCollaborator(identity: string) {
    const collaborators = this.store.meta.collaborators || []
    if (!collaborators.length) return true
    return collaborators.includes(identity)
  }

  async save() {
    if (!this.storage) {
      // First try load from local storage
      this.storage = new IndexeddbPersistence(this.doc.guid, this.doc)
    }

    await new Promise(resolve => this.storage?.once('synced', resolve))
  }

  /**
   * Loads entity from local storage
   */
  async load() {
    const signal = AbortSignal.timeout(2000)

    if (!this.storage) {
      // First try load from local storage
      this.storage = new IndexeddbPersistence(this.doc.guid, this.doc)
    }

    this.doc.load()

    if (!this.rtc) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      this.rtc = new VerifiedRTCProvider(this.doc.guid, this.doc, {
        signaling: ['ws://localhost:8000/signaling'],
        // Ignore updates from non-collaborators
        filterIncomingMessage: from => this.isCollaborator(from)
      })

      // get verified uuid from provider
      this.rtc.once('user', (uuid: string) => {
        const user = { uuid }
        this.currentUser.set(user)
        this.rtc?.awareness.setLocalStateField('user', user)
        update_user(user)
      })

      this.rtc.awareness.on('change', () => {
        if (!this.rtc) return
        const awareness = this.rtc.awareness
        const newState: Record<string, UserAwareness> = {}
        awareness.getStates().forEach((_state, cid: number) => {
          if (cid === awareness.clientID) return

          const state = _state as UserAwareness
          newState[state.user.uuid] = state
        })

        this.user_store.update(() => newState)
      })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function warnReadOnlyEdit(_: Uint8Array, origin: any) {
      if (origin != null) return
      // TODO: state has been corrupted
      // re-sync somehow?
      throw new Error('Document is read-only')
    }

    this.isEditable.subscribe(editable => {
      if (!editable) {
        this.doc.on('update', warnReadOnlyEdit)
      } else {
        this.doc.off('update', warnReadOnlyEdit)
      }
    })

    await new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('Not found')))
      intoReadable(this.store.meta).subscribe(meta => {
        if (meta.createdAt) {
          resolve(void 0)
        }
      })
    })

    return this
  }

  private handleDocumentUpdated() {
    const { meta } = this.store

    meta.updatedAt ??= new Date().toISOString()
  }

  private populate() {
    const { meta } = this.store

    meta.title ??= 'Untitled Workspace'
    meta.createdAt ??= new Date().toISOString()
    meta.updatedAt ??= new Date().toISOString()
    const currentUser = get(this.currentUser)
    if (currentUser) {
      meta.collaborators ??= [currentUser.uuid]
    } else {
      meta.collaborators ??= []
    }
  }

  private get storeReactive() {
    return intoReadable(this.store)
  }

  get isEditable(): Readable<boolean> {
    return derived(
      [intoReadable(this.store.meta), this.currentUser],
      ([meta, currentUser]) => {
        if (!meta.collaborators?.length || !currentUser) return false
        return meta.collaborators.includes(currentUser.uuid)
      }
    )
  }

  get meta(): Readable<WorkspaceMeta> {
    // TODO: meta may be empty until synced
    return derived(this.storeReactive, store => store.meta as WorkspaceMeta)
  }

  get links(): Readable<Required<Link>[]> {
    return derived(this.storeReactive, store => store.links)
  }

  get modules(): Readable<Module[]> {
    return derived(this.storeReactive, store => store.modules)
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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        state: INITIAL_STATE[type],
        position
      })
    }

    return id
  }

  move_module(id: string, x: number, y: number): boolean {
    const { modules } = this.store

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

  remove_module(id: string) {
    const { modules } = this.store

    const index = modules.findIndex(module => module.id === id)
    if (index >= 0) {
      modules.splice(index, 1)
    }
  }

  clone_module(id: string) {
    const { modules } = this.store

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

  // Module selectors
  module_position(id: string): Readable<Position> {
    return derived(intoReadable(this.store.modules), modules => {
      const mod = modules.find(module => module.id === id)
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
    const index = links.findIndex(link => link.id === link_id)
    if (index >= 0) {
      links.splice(index, 1)
    }
  }

  cleanup() {
    // TODO: do I really want to do this?
    this.doc.destroy()
  }
}
