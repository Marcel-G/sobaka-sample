import { IndexeddbPersistence } from 'y-indexeddb'
import * as Y from 'yjs'
import { User } from './user'

type ManagerData = { docStr: string; user: User }

export class WorkspaceManager {
  constructor(private doc: Y.Doc, public user: User) {}

  static async fromStorage(user: User) {
    const doc = new Y.Doc()
    const provider = new IndexeddbPersistence(user.uuid, doc)
    await provider.whenSynced
    provider.destroy()

    doc.on('subdocs', ({ loaded }) => {
      loaded.forEach((subdoc: Y.Doc) => {
        new IndexeddbPersistence(subdoc.guid, subdoc)
      })
    })

    return new WorkspaceManager(doc, user)
  }

  static fromData(data: ManagerData) {
    const binString = atob(data.docStr)
    const binaryEncoded = Uint8Array.from(binString, m => m.codePointAt(0)!)
    const doc = new Y.Doc()
    Y.applyUpdate(doc, binaryEncoded)

    return new WorkspaceManager(doc, data.user)
  }

  storageSynced() {
    new IndexeddbPersistence(this.user.uuid, this.doc)

    this.doc.on('subdocs', ({ loaded }) => {
      loaded.forEach((subdoc: Y.Doc) => {
        new IndexeddbPersistence(subdoc.guid, subdoc)
      })
    })

    return this
  }

  toData(): ManagerData {
    const documentState = Y.encodeStateAsUpdate(this.doc)
    const binString = Array.from(documentState, byte => String.fromCodePoint(byte)).join(
      ''
    )
    const docStr = btoa(binString)

    return { docStr, user: this.user }
  }

  getUser(): Y.Map<Record<string, unknown>> {
    return this.doc.getMap('user')
  }

  addWorkspace(): Y.Doc {
    const doc = new Y.Doc()
    this.listWorkspaces().push([doc])
    return doc
  }

  removeWorkspace(doc: Y.Doc) {
    const index = this.listWorkspaces().toArray().indexOf(doc)
    this.doc.getArray<Y.Doc>('workspaces').delete(index, 1)
    doc.destroy()
  }

  listWorkspaces(): Y.Array<Y.Doc> {
    return this.doc.getArray<Y.Doc>('workspaces')
  }

  loadWorkspace(guid: string) {
    const index = this.listWorkspaces()
      .toArray()
      .findIndex(doc => doc.guid === guid)

    if (index === -1) {
      // Try to load asynchroniously from webrtc
      throw new Error(`Workspace with guid ${guid} not found`)
    }

    const workspace = this.listWorkspaces().get(index)

    workspace.load()

    return workspace
  }
}
