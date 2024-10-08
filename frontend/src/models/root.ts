import syncedStore from '@syncedstore/core'
import { MappedTypeDescription } from '@syncedstore/core/types/doc'
import { derived, Readable } from 'svelte/store'
import * as Y from 'yjs'
import { WorkspaceList } from './workspaceList'
import { SubDocReference } from '../util/subdoc'
import { intoReadable } from '../util/store'
import { IndexeddbPersistence } from 'y-indexeddb'

type RootStore = {
  workspaceLists: SubDocReference[]
  user: SubDocReference
}

const ROOT_STORE_SHAPE = {
  workspaceLists: [],
  user: {}
}

const ROOT_DOC_GUID = 'sobaka-root'
const USER_LIST_GUID = 'sobaka-user-list'

/**
 * Top level document storage
 */
export class Root {
  private store: MappedTypeDescription<RootStore>
  private cache: WeakMap<SubDocReference, WorkspaceList> = new WeakMap()

  constructor(private doc: Y.Doc) {
    this.store = syncedStore(ROOT_STORE_SHAPE, doc)

    this.doc.on('synced', () => {
      this.populate()
    })
  }

  static init() {
    return new Root(new Y.Doc({ guid: ROOT_DOC_GUID }))
  }

  /**
   * Loads entity from local storage
   */
  async load() {
    this.storageSynced()
    this.doc.load()
    return new Promise(resolve => this.doc.on('synced', resolve))
  }

  storageSynced(): Root {
    const provider = new IndexeddbPersistence(this.doc.guid, this.doc)
    provider.on('synced', () => {
      this.doc.emit('synced', [this])
    })
    return this
  }

  populate() {
    if (
      !this.store.workspaceLists
        .map(WorkspaceList.fromRef)
        .some(workspace => workspace.id === USER_LIST_GUID)
    ) {
      this.store.workspaceLists.push(
        WorkspaceList.create(new Y.Doc({ guid: USER_LIST_GUID })).intoRef()
      )
    }
  }

  user() {
    return this.doc.getMap('user')
  }

  private getCachedWorkspaceList(ref: SubDocReference): WorkspaceList {
    let list = this.cache.get(ref)
    if (!list) {
      list = WorkspaceList.fromRef(ref)
      this.cache.set(ref, list)
    }
    return list
  }

  // TODO: What do do about readable vs non readable methods.
  _workspaceLists(): WorkspaceList[] {
    return this.store.workspaceLists.map(ref => this.getCachedWorkspaceList(ref))
  }

  workspaceLists(): Readable<WorkspaceList[]> {
    return derived(intoReadable(this.store.workspaceLists), workspaceLists =>
      workspaceLists.map(ref => this.getCachedWorkspaceList(ref))
    )
  }

  find_workspace(workspaceId: string) {
    return this._workspaceLists()
      .flatMap(workspaceList => workspaceList._workspaces())
      .find(workspace => workspace.id === workspaceId)
  }
}
