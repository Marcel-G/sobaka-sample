import syncedStore from '@syncedstore/core'
import { type Readable } from 'svelte/store'
import * as Y from 'yjs'
import { WorkspaceList } from './workspaceList.ts'
import { type SubDocReference } from '../util/subdoc.ts'
import { intoReadable } from '../util/store.ts'
import { SyncedDoc, SyncedDocFactory, type Config } from './syncedDoc.ts'
import type { Workspace } from './workspace.ts'

type RootStore = {
  workspaceLists: SubDocReference<WorkspaceList>[]
}

export interface GlobalContext {
  workspaces: SyncedDocFactory<Workspace>
  lists: SyncedDocFactory<WorkspaceList>
}

const ROOT_STORE_SHAPE = {
  workspaceLists: []
}

/**
 * Top level document storage for a user.
 * 
 * Each user has their own root document (UUID = user's identity).
 * The root contains workspace lists that the user has created or has access to.
 * 
 * There is also a special "global root" (GLOBAL_ROOT_UUID) that contains
 * the "Intro" workspace list visible to all users. Only admins can edit it.
 */
export class Root extends SyncedDoc<'root'> {
  private store: ReturnType<typeof syncedStore<RootStore>>

  constructor(doc: Y.Doc, config: Config) {
    super('root', doc, config)
    this.store = syncedStore(ROOT_STORE_SHAPE, doc)
  }

  static fromRef(ref: SubDocReference<Root>, config: Config) {
    return new Root(new Y.Doc(ref), config)
  }

  /**
   * Migrate the root document to ensure it has required structure.
   * For user roots: creates "My Workspaces" list if missing.
   * For global root: creates "Intro" list if missing (admin only).
   */
  migrate(ctx: GlobalContext, listName?: string) {
    // Add workspace list if missing
    if (!this.store.workspaceLists.at(0)) {
      const list = ctx.lists.get()
      list.create(this.config.currentUser, listName)
      this.store.workspaceLists.push(list.intoRef())
    }
  }

  userList() {
    const userList = this.store.workspaceLists.at(0)
    if (!userList) {
      throw new Error('User list not found')
    }
    return userList
  }

  addList(list: WorkspaceList) {
    this.store.workspaceLists.push(list.intoRef())
  }

  workspaceLists(): Readable<SubDocReference<WorkspaceList>[]> {
    return intoReadable(this.store.workspaceLists)
  }
}
