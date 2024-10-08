import syncedStore from '@syncedstore/core'
import { MappedTypeDescription } from '@syncedstore/core/types/doc'
import { derived, Readable } from 'svelte/store'
import { IndexeddbPersistence } from 'y-indexeddb'
import * as Y from 'yjs'
import { intoReadable } from '../util/store'
import { SubDocReference } from '../util/subdoc'
import { Workspace } from './workspace'

type WorkspaceListStore = {
  workspaces: SubDocReference[]
}

const WORKSPACE_LIST_STORE_SHAPE = {
  workspaces: []
}

export class WorkspaceList {
  private store: MappedTypeDescription<WorkspaceListStore>
  private cache: WeakMap<SubDocReference, Workspace> = new WeakMap()

  constructor(private doc: Y.Doc) {
    this.store = syncedStore(WORKSPACE_LIST_STORE_SHAPE, doc)
  }

  static create(doc: Y.Doc = new Y.Doc()) {
    return new Workspace(doc)
  }

  static fromRef(ref: SubDocReference) {
    return new WorkspaceList(new Y.Doc(ref))
  }

  intoRef(): SubDocReference {
    return { guid: this.doc.guid }
  }

  get id() {
    return this.doc.guid
  }

  /**
   * Loads entity from local storage
   */
  async load() {
    this.storageSynced()
    this.doc.load()
    return new Promise(resolve => this.doc.on('synced', resolve))
  }

  storageSynced(): WorkspaceList {
    const provider = new IndexeddbPersistence(this.doc.guid, this.doc)
    provider.on('synced', () => {
      this.doc.emit('synced', [this])
    })
    return this
  }

  private getCachedWorkspace(ref: SubDocReference): Workspace {
    let workspace = this.cache.get(ref)
    if (!workspace) {
      workspace = Workspace.fromRef(ref)
      this.cache.set(ref, workspace)
    }
    return workspace
  }

  // TODO: What do do about readable vs non readable methods.
  _workspaces(): Workspace[] {
    return this.store.workspaces.map(ref => this.getCachedWorkspace(ref))
  }

  workspaces(): Readable<Workspace[]> {
    return derived(intoReadable(this.store.workspaces), workspace =>
      workspace.map(ref => this.getCachedWorkspace(ref))
    )
  }

  add(workspace: Workspace) {
    this.store.workspaces.push(workspace.intoRef())
  }

  new() {
    const workspace = Workspace.create()
    this.store.workspaces.push(workspace.intoRef())
  }

  remove(workspace: Workspace) {
    const index = this.store.workspaces.findIndex(
      doc => Workspace.fromRef(doc).id === workspace.id
    )

    if (index >= 0) {
      this.store.workspaces.splice(index, 1)
    }
  }
}
