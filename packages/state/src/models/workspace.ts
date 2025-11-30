import * as Y from 'yjs'

import syncedStore from '@syncedstore/core'
import { derived, writable, type Readable } from 'svelte/store'

import cloneDeep from 'lodash/cloneDeep'
import { intoReadable } from '../util/store'
import { type SubDocReference } from '../util/subdoc'
import { SyncedDoc, type Config } from './syncedDoc'
import { isFullyLinked, type Link } from './links'

export interface Position {
  x: number
  y: number
}


export interface WorkspaceDoc {
  modules: Array<Module>
  links: Array<Required<Link>>
}

export interface Module {
  id: string
  type: string
  state: Record<string, unknown> // Needs to be mutable from inside a module
  position: {
    x: number
    y: number
  }
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

export interface User {
  uuid: string
}

type UserAwareness = {
  user: User
}

export class Workspace extends SyncedDoc<'workspace'> {
  private store: ReturnType<typeof syncedStore<WorkspaceStore>>
  userStore = writable<Record<string, UserAwareness>>({})
  pendingLinkStore = writable<Partial<Link> | null>(null)

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

  fork() {
    const workspace = new Workspace(
      this.forkDoc(this.config.currentUser),
      this.config,
    )

    if (!workspace.store.info.title?.endsWith('(fork)')) {
      workspace.store.info.title += ' (fork)'
    }
    workspace.rtc.destroy()

    return workspace
  }

  static fromRef(
    config: Config,
    ref?: SubDocReference<Workspace>
  ) {
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

    this.userStore.update(() => newState)
  }

  // Note: Plug registration is handled by the AudioGraph in the DSP package
  // No plug registration methods needed here - the graph manages everything

  // Module actions
  createModule(type: string, position: { x: number; y: number }): string {
    const id = crypto.randomUUID()

    const { modules } = this.store

    if (modules) {
      modules.push({
        id,
        type,
        // TS doesn't know about svelte module imports - https://github.com/sveltejs/svelte/issues/5817

        state: {},
        position
      })
    }

    return id
  }

  moveModule(id: string, x: number, y: number): boolean {
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

  removeModule(id: string) {
    const { modules, links } = this.store

    const index = modules.findIndex(byModuleId(id))
    if (index >= 0) {
      modules.splice(index, 1)
    }

    links
      .filter(link => link.from.moduleId === id || link.to.moduleId === id)
      .map(link => link.id)
      .forEach(id => this.removeLink(id))
  }

  cloneModule(id: string) {
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

  override destroy() {
    // Call parent destroy
    super.destroy()
  }

  // Module selectors
  modulePosition(id: string): Readable<Position> {
    return derived(intoReadable(this.store.modules), modules => {
      const mod = modules.find(byModuleId(id))
      if (mod) {
        return mod.position
      } else {
        return { x: 0, y: 0 }
      }
    })
  }

  tryMakeLink(moduleId: string, routeName: string) {
    this.pendingLinkStore.update(link => {
      const next = link ? { ...link } : {}
      if (!next.to) { // TODO figure out source / dest plugs
        next.to = {
          routeName,
          moduleId
        }
      } else {
        next.from = {
          routeName,
          moduleId
        }
      }

      if (isFullyLinked(next)) {
        this.addLink(next)
        return null
      }

      return next
    })
  }

  tryMakeLinkToMixer(chan = 0) {
    this.pendingLinkStore.update(link => {
      if (link?.from) {
        this.addLink({
          from: link.from,
          to: { moduleId: 'global', routeName: 'mixer' }
        })
        return null
      }
      return link
    })
  }

  // Link actions
  addLink(link: Link): string {
    const id = crypto.randomUUID()
    const { links } = this.store

    links.push({ ...link, id })

    return id
  }

  removeLink(linkId: string) {
    const { links } = this.store
    const index = links.findIndex(byLinkId(linkId))
    if (index >= 0) {
      links.splice(index, 1)
    }
  }
}

const byModuleId = (id: string) => (module: Module) => module.id === id
const byLinkId = (id: string) => (link: Required<Link>) => link.id === id
