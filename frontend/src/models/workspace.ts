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
import { createPositionStores } from '../context/positions'
import type { NodeContext, ParamContext } from '../context/plugs'
import { createPlugId, is_fully_linked, plug_type, PlugType, type Link } from './links'

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
  positions = createPositionStores()
  user_store = writable<Record<string, UserAwareness>>({})
  pending_link_store = writable<Partial<Link> | null>(null)
  private plug_context = writable<Record<string, ParamContext | NodeContext>>({})

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

    audioConnector(this.plug_context, this.links)
  }

  fork() {
    const workspace = new Workspace(this.forkDoc(this.config.currentUser), this.config)

    if (!workspace.store.info.title?.endsWith('(fork)')) {
      workspace.store.info.title += ' (fork)'
    }
    workspace.rtc.destroy()

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

  register_plug(id: string, context: ParamContext | NodeContext) {
    this.plug_context.update(contexts => {
      contexts[id] = context
      return contexts
    })
  }

  remove_plug(id: string) {
    this.plug_context.update(contexts => {
      delete contexts[id]
      return contexts
    })
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
    const { modules, links } = this.store

    const index = modules.findIndex(byModuleId(id))
    if (index >= 0) {
      modules.splice(index, 1)
    }

    links
      .filter(link => link.from.startsWith(id) || link.to.startsWith(id))
      .map(link => link.id)
      .forEach(id => this.remove_link(id))
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

  try_make_link(plugId: string) {
    const type = plug_type(plugId)

    this.pending_link_store.update(link => {
      const next = link ? { ...link } : {}
      if ([PlugType.Input, PlugType.Param].includes(type)) {
        next.to = plugId
      } else {
        next.from = plugId
      }

      if (is_fully_linked(next)) {
        this.add_link(next)
        return null
      }

      return next
    })
  }

  try_make_link_to_mixer(chan = 0) {
    this.pending_link_store.update(link => {
      if (link?.from) {
        this.add_link({
          from: link.from,
          to: createPlugId('global', PlugType.Mixer, chan)
        })
        return null
      }
      return link
    })
  }

  // Link actions
  add_link(link: Link): string {
    const id = crypto.randomUUID()
    const { links } = this.store

    links.push({ ...link, id })

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

// TODO: audio nodes should probably not live within the UI components
//       but it's a bit too much work to change right now.
const audioConnector = (
  plugs: Readable<Record<string, ParamContext | NodeContext>>,
  links: Readable<Required<Link>[]>
) => {
  const currentConnections = new Map<string, () => void>()

  derived([plugs, links], ([$plugs, $links]) => [$plugs, $links] as const).subscribe(
    ([$plugs, $links]) => {
      // Remove stale connections
      for (const [linkId, dispose] of currentConnections) {
        if (!$links.find(l => l.id === linkId)) {
          dispose()
          currentConnections.delete(linkId)
        }
      }

      // Update/create connections
      for (const link of $links) {
        // Skip if connection already exists
        if (currentConnections.has(link.id)) continue

        const from = $plugs[link.from]
        const to = $plugs[link.to]

        if (!from || !to) continue

        try {
          if (to.type === PlugType.Param && from.type === PlugType.Output) {
            if (!to.param || !from.module) continue
            from.module.connect(to.param, from.connectIndex)
            const dispose = () => from.module?.disconnect(to.param, from.connectIndex)
            currentConnections.set(link.id, dispose)
          } else if (
            (to.type === PlugType.Input || to.type === PlugType.Mixer) &&
            from.type === PlugType.Output
          ) {
            if (!to.module || !from.module) continue
            from.module.connect(to.module, from.connectIndex, to.connectIndex)
            const dispose = () =>
              from.module.disconnect(to.module, from.connectIndex, to.connectIndex)
            currentConnections.set(link.id, dispose)
          } else {
            throw new Error('Invalid connection')
          }
        } catch (err) {
          console.warn('Failed to create audio connection:', err)
        }
      }
    }
  )
}

const byModuleId = (id: string) => (module: Module) => module.id === id
const byLinkId = (id: string) => (link: Required<Link>) => link.id === id
