import * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'
import { VerifiedRTCProvider } from '../networking/provider.ts'
import { DocMeta } from './docMeta.ts'
import { writable, type Readable } from 'svelte/store'
import type { SubDocReference } from '../util/subdoc.ts'

/**
 * Well-known UUID for the global root workspace.
 * This workspace contains the "Intro" list visible to all users (readonly).
 * Admins can edit the global root and its workspaces.
 */
export const GLOBAL_ROOT_UUID = '00000000-0000-0000-0000-000000000000'

export interface Config {
  currentUser: string
  iceServers: IceServer[]
  signaling: string[]
  
  /**
   * Function to get initial state for a module type.
   * This is provided by the app's plugin registry.
   */
  getInitialState?: (type: string) => Record<string, unknown> | null
}

interface IceServer {
  urls: string | string[]
  username?: string
  credential?: string
}

export class SyncedDoc<K extends string> {
  meta: DocMeta<K>
  rtc: VerifiedRTCProvider

  private doc: Y.Doc
  private storage: IndexeddbPersistence
  private _isEditable = writable(false)

  constructor(
    kind: K,
    doc: Y.Doc,
    public config: Config
  ) {
    this.doc = doc
    this.meta = new DocMeta(kind, this.doc.getMap('meta'))

    this.storage = new IndexeddbPersistence(this.doc.guid, this.doc)
    this.rtc = new VerifiedRTCProvider(this.doc.guid, this.doc, {
      // Ignore updates from non-collaborators
      filterIncomingMessage: from => this.filterIncomingMessage(from),
      signaling: config.signaling,
      iceServers: config.iceServers
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function warnReadOnlyEdit(_: Uint8Array, origin: any) {
      if (origin != null) return
      // TODO: state has been corrupted
      // re-sync somehow?
      throw new Error('Document is read-only')
    }

    // Block writes when not allowed
    this.isEditable.subscribe(editable => {
      if (editable) {
        this.doc.off('update', warnReadOnlyEdit)
      } else {
        this.doc.on('update', warnReadOnlyEdit)
      }
    })

    this.synced(() => {
      this.meta.validate()
      // Updates editable status based on collaborators
      this.meta.collaborators.observe(() => {
        this.handleCollaboratorChange()
      })
      this.handleCollaboratorChange()
    })

    // Update document meta when something changes
    this.doc.on('update', (_, origin) => {
      if (origin != null) return
      this.doc.transact(() => {
        this.meta.handleUpdate()
      }, this)
    })
  }

  public forkDoc(owner: string) {
    const doc = new Y.Doc()
    Y.applyUpdate(doc, Y.encodeStateAsUpdate(this.doc))
    const meta = new DocMeta(this.meta.kind, doc.getMap('meta'))
    meta.takeOwnership(owner)

    return doc
  }

  public destroy() {
    this.rtc.destroy()
    this.doc.destroy()
  }

  get isEditable(): Readable<boolean> {
    return this._isEditable
  }

  intoRef(): SubDocReference<this> {
    return { guid: this.doc.guid } as SubDocReference<this>
  }

  get id() {
    return this.doc.guid
  }

  private filterIncomingMessage(identity: string) {
    // Allow incoming messages frm anyone if the document is empty.
    if (this.meta.isEmpty) return true
    // Otherwise only accept messges from collaborators
    return this.meta.isCollaborator(identity)
  }

  synced(fn: () => void) {
    this.meta.synced(fn)
  }

  async save() {
    if (this.storage.synced) return
    await new Promise(resolve => this.storage?.once('synced', resolve))
  }

  async load(options: Partial<{ localOnly: boolean }> = {}) {
    this.doc.load()
    if (!this.meta.isEmpty) {
      return
    }

    if (options.localOnly) {
      await new Promise(resolve => this.storage.once('synced', resolve))

      this.meta.validate()
      return
    }

    const signal = AbortSignal.timeout(30_000)
    await new Promise<void>((resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('Not found')))
      this.synced(resolve)
    })
  }

  private handleCollaboratorChange() {
    this._isEditable.set(this.meta.isCollaborator(this.config.currentUser))
  }

  create(owner: string, name?: string) {
    if (!this.meta.isEmpty) {
      throw new Error('Document already exists')
    }
    this.doc.transact(() => {
      this.meta.populate()
      this.meta.addCollaborator(owner)
      if (name) {
        this.meta.name = name
      }
    }, this)
  }

  addCollaborator(identity: string) {
    this.doc.transact(() => {
      this.meta.addCollaborator(identity)
    }, this)
  }

  removeCollaborator(identity: string) {
    this.doc.transact(() => {
      this.meta.removeCollaborator(identity)
    }, this)
  }
}

export class SyncedDocFactory<T extends SyncedDoc<string>> {
  private cache: Map<string, T> = new Map()

  constructor(private createFn: (ref?: SubDocReference<T>) => T) {}

  public get(ref?: SubDocReference<T>): T {
    if (ref) {
      const item = this.cache.get(ref.guid)
      if (item) return item
    }
    const newItem = this.createFn(ref)
    this.cache.set(newItem.intoRef().guid, newItem)
    return newItem
  }

  public clear() {
    for (const item of this.cache.values()) {
      item.destroy()
    }
    this.cache.clear()
  }
}
