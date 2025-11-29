import * as Y from 'yjs'

import syncedStore from '@syncedstore/core'
import { derived, writable, type Readable } from 'svelte/store'

import cloneDeep from 'lodash/cloneDeep'
import { intoReadable } from '../util/store.js'
import { type SubDocReference } from '../util/subdoc.js'
import { SyncedDoc, type Config } from './syncedDoc.js'
import { createPlugId, is_fully_linked, plug_type, PlugType, type Link } from './links.js'
import { NodeContext, ParamContext } from './plugs.js'

export interface Position {
  x: number
  y: number
}

// Module types - these should match the UI module types
export type ModuleUI = 
  | 'Clock'
  | 'Envelope'
  | 'Filter'
  | 'Oscillator'
  | 'Parameter'
  | 'Reverb'
  | 'Sequencer'
  | 'StepSequencer'
  | 'Vca'
  | 'Noise'
  | 'Delay'
  | 'Scope'
  | 'SpecScope'
  | 'Lfo'
  | 'Quantiser'
  | 'SampleAndHold'

// Initial state registry - can be populated by UI layer
export const INITIAL_STATE: Record<ModuleUI, any> = {} as any

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

type User = unknown

type UserAwareness = {
  user: User
}

export class Workspace extends SyncedDoc<'workspace'> {
  private store: ReturnType<typeof syncedStore<WorkspaceStore>>
  user_store = writable<Record<string, UserAwareness>>({})
  pending_link_store = writable<Partial<Link> | null>(null)
  private plug_context = writable<Record<string, ParamContext | NodeContext>>({})

  constructor(doc: Y.Doc, config: Config, audioContext: AudioContext) {
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

  fork(audioContext: AudioContext) {
    const workspace = new Workspace(
      this.forkDoc(this.config.currentUser),
      this.config,
      audioContext
    )

    if (!workspace.store.info.title?.endsWith('(fork)')) {
      workspace.store.info.title += ' (fork)'
    }
    workspace.rtc.destroy()

    return workspace
  }

  static fromRef(
    config: Config,
    audioContext: AudioContext,
    ref?: SubDocReference<Workspace>
  ) {
    return new Workspace(new Y.Doc(ref), config, audioContext)
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

  // Note: Plug registration is now handled automatically by the DSP manager
  // These methods are kept for backwards compatibility but are no-ops
  register_plug(_id: string, _context: ParamContext | NodeContext) {
    // Plugs are now managed by DSP layer
  }

  remove_plug(_id: string) {
    // Plugs are now managed by DSP layer
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

  override destroy() {
    // Call parent destroy
    super.destroy()
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

const byModuleId = (id: string) => (module: Module) => module.id === id
const byLinkId = (id: string) => (link: Required<Link>) => link.id === id
