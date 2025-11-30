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
 * Top level document storage
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

  migrate(ctx: GlobalContext) {
    // Add user list if missing
    if (!this.store.workspaceLists.at(0)) {
      const list = ctx.lists.get()
      list.create(this.config.currentUser)
      this.store.workspaceLists.push(list.intoRef())
    }
    // Add or update globally shared lists
    this.config.globalLists.forEach((guid, index) => {
      const targetIndex = index + 1
      const ref = { guid } as SubDocReference<WorkspaceList>
      const current = this.store.workspaceLists.at(targetIndex)

      if (this.store.workspaceLists.at(0)?.guid === guid) {
        if (current) {
          this.store.workspaceLists.splice(targetIndex, 1)
        }
      } else if (!current) {
        this.store.workspaceLists.push(ref)
      } else if (current.guid !== guid) {
        // Replace or insert at correct position
        this.store.workspaceLists.splice(targetIndex, 1, ref)
      }
    })
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
