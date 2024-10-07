import syncedStore from '@syncedstore/core'
import { MappedTypeDescription } from '@syncedstore/core/types/doc'
import { derived, Readable } from 'svelte/store'
import * as Y from 'yjs'
import { intoReadable } from '../util/store'
import { SubDoc, SubDocReference } from '../util/subdoc'
import { Workspace } from './workspace'

type WorkspaceListStore = {
  workspaces: SubDocReference[]
}

const WORKSPACE_LIST_STORE_SHAPE = {
  workspaces: []
}

export class WorkspaceList {
  private store: MappedTypeDescription<WorkspaceListStore>

  constructor(private doc: Y.Doc) {
    doc.load()
    this.store = syncedStore(WORKSPACE_LIST_STORE_SHAPE, doc)
  }

  static create(doc: Y.Doc = new Y.Doc()) {
    return new Workspace(doc)
  }

  static fromRef(ref: SubDocReference) {
    return new WorkspaceList(SubDoc.fromRef(ref).inner)
  }

  intoRef(): SubDocReference {
    return new SubDoc(this.doc).intoRef()
  }

  get id() {
    return this.doc.guid
  }

  // TODO: What do do about readable vs non readable methods.
  _workspaces(): Workspace[] {
    return this.store.workspaces.map(Workspace.fromRef)
  }

  workspaces(): Readable<Workspace[]> {
    return derived(intoReadable(this.store.workspaces), workspace =>
      workspace.map(Workspace.fromRef)
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
