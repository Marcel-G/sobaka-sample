import syncedStore from '@syncedstore/core'
import { type Readable } from 'svelte/store'
import * as Y from 'yjs'
import { intoReadable } from '../util/store'
import { type SubDocReference } from '../util/subdoc'
import { Workspace } from './workspace'
import { SyncedDoc, type Config } from './syncedDoc'

type WorkspaceListStore = {
  workspaces: SubDocReference<Workspace>[]
}

const WORKSPACE_LIST_STORE_SHAPE = {
  workspaces: []
}

export class WorkspaceList extends SyncedDoc<'workspaceList'> {
  private store: ReturnType<typeof syncedStore<WorkspaceListStore>>

  constructor(doc: Y.Doc, config: Config) {
    super('workspaceList', doc, config)
    this.store = syncedStore(WORKSPACE_LIST_STORE_SHAPE, doc)
  }

  static create(doc: Y.Doc = new Y.Doc(), config: Config) {
    const list = new WorkspaceList(doc, config)
    list.create(config.currentUser)
    return list
  }

  static fromRef(config: Config, ref?: SubDocReference<WorkspaceList>) {
    return new WorkspaceList(new Y.Doc(ref), config)
  }

  workspaces(): Readable<SubDocReference<Workspace>[]> {
    return intoReadable(this.store.workspaces)
  }

  add(workspace: Workspace) {
    this.store.workspaces.push(workspace.intoRef())
  }

  remove(ref: SubDocReference<Workspace>) {
    const index = this.store.workspaces.findIndex(r => ref.guid === r.guid)

    if (index >= 0) {
      this.store.workspaces.splice(index, 1)
    }
  }
}
