import syncedStore from '@syncedstore/core'
import { MappedTypeDescription } from '@syncedstore/core/types/doc'
import { derived, Readable } from 'svelte/store'
import * as Y from 'yjs'
import { WorkspaceList } from './workspaceList'
import { SubdocIndexeddbPersistence } from '../providers/subdocIndexeddbPersistence'
import { SubDocReference } from '../util/subdoc'
import { intoReadable } from '../util/store'

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

  constructor(private doc: Y.Doc) {
    this.store = syncedStore(ROOT_STORE_SHAPE, doc)
    new SubdocIndexeddbPersistence(doc)

    this.doc.on('synced', () => {
      this.populate()
    })
  }

  static init() {
    return new Root(new Y.Doc({ guid: ROOT_DOC_GUID }))
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

  // TODO: What do do about readable vs non readable methods.
  _workspaceLists(): WorkspaceList[] {
    return this.store.workspaceLists.map(doc => WorkspaceList.fromRef(doc))
  }

  workspaceLists(): Readable<WorkspaceList[]> {
    return derived(intoReadable(this.store.workspaceLists), workspaceLists =>
      workspaceLists.map(doc => WorkspaceList.fromRef(doc))
    )
  }

  find_workspace(workspaceId: string) {
    return this._workspaceLists()
      .flatMap(workspaceList => workspaceList._workspaces())
      .find(workspace => workspace.id === workspaceId)
  }
}
