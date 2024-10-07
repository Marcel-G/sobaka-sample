import * as Y from 'yjs'

import syncedStore from '@syncedstore/core'
import { DocTypeDescription, MappedTypeDescription } from '@syncedstore/core/types/doc'
import { derived, Readable } from 'svelte/store'

import { cloneDeep } from 'lodash'
import { INITIAL_STATE, ModuleUI } from '../modules'
import { intoReadable } from '../util/store'
import { SubDoc, SubDocReference } from '../util/subdoc'
import { Position } from '../@types'

export type WorkspaceMeta = {
  title: string
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

type WorkspaceStore = {
  meta: WorkspaceMeta
  modules: Array<Module>
  links: Array<Required<Link>>
}

const WORKSPACE_STORE_SHAPE = {
  meta: {} as WorkspaceMeta,
  modules: [],
  links: []
}

export class Workspace {
  private store: MappedTypeDescription<WorkspaceStore>

  constructor(private doc: Y.Doc) {
    doc.load()
    this.store = syncedStore(WORKSPACE_STORE_SHAPE, doc)

    this.doc.on('synced', () => {
      this.populate()
    })
  }

  static create(doc: Y.Doc = new Y.Doc()) {
    return new Workspace(doc)
  }

  static fromRef(ref: SubDocReference) {
    return new Workspace(SubDoc.fromRef(ref).inner)
  }

  populate() {
    const { meta } = this.store

    meta.title ??= 'Untitled Workspace'
    meta.createdAt ??= new Date().toISOString()
    meta.updatedAt ??= new Date().toISOString()
  }

  intoRef(): SubDocReference {
    return new SubDoc(this.doc).intoRef()
  }

  get meta(): Readable<WorkspaceMeta> {
    // TODO: meta may be empty until synced
    return intoReadable(this.store.meta as WorkspaceMeta)
  }

  get links(): Readable<Required<Link>[]> {
    return intoReadable(this.store.links)
  }

  get modules(): Readable<Module[]> {
    return intoReadable(this.store.modules)
  }

  get id() {
    return this.doc.guid
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
