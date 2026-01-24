import * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'
import { VerifiedRTCProvider } from '../networking/provider.ts'
import { DocMeta } from './docMeta.ts'
import { writable, readonly, type Readable } from 'svelte/store'
import type { SubDocReference } from '../util/subdoc.ts'

export interface Config {
  currentUser: string
  iceServers: IceServer[]
  signaling: string[]
  globalLists: string[]
  
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

/**
 * Loading state for documents fetched from the network
 */
export type LoadingState = 
  | { status: 'loading'; message: string }
  | { status: 'not_found'; message: string; retrying: boolean }
  | { status: 'loaded' }
  | { status: 'error'; message: string }

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

    const signal = AbortSignal.timeout(2000)
    await new Promise<void>((resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('Not found')))
      this.synced(resolve)
    })
  }

  /**
   * Load the document with retry logic and exponential backoff.
   * Returns a readable store with the current loading state.
   * 
   * @param options.initialTimeout - Initial timeout before showing "not found" (default: 3000ms)
   * @param options.maxRetryDelay - Maximum delay between retries (default: 30000ms)
   * @param options.onLoaded - Callback when document is successfully loaded
   */
  loadWithRetry(options: {
    initialTimeout?: number
    maxRetryDelay?: number
    onLoaded?: () => void
  } = {}): Readable<LoadingState> {
    const { 
      initialTimeout = 3000, 
      maxRetryDelay = 30000,
      onLoaded 
    } = options

    const state = writable<LoadingState>({ 
      status: 'loading', 
      message: 'Looking for workspace...' 
    })
    
    let cancelled = false
    let retryCount = 0
    
    const attemptLoad = async (): Promise<boolean> => {
      if (cancelled) return false
      
      this.doc.load()
      
      // Already have data
      if (!this.meta.isEmpty) {
        state.set({ status: 'loaded' })
        onLoaded?.()
        return true
      }
      
      // Wait for sync with timeout
      const timeout = retryCount === 0 ? initialTimeout : Math.min(
        1000 * Math.pow(2, retryCount),
        maxRetryDelay
      )
      
      return new Promise<boolean>((resolve) => {
        let resolved = false
        
        const timeoutId = setTimeout(() => {
          if (resolved || cancelled) return
          resolved = true
          resolve(false)
        }, timeout)
        
        this.synced(() => {
          if (resolved || cancelled) return
          resolved = true
          clearTimeout(timeoutId)
          
          if (!this.meta.isEmpty) {
            state.set({ status: 'loaded' })
            onLoaded?.()
            resolve(true)
          } else {
            resolve(false)
          }
        })
      })
    }
    
    const retryLoop = async () => {
      // Initial attempt
      const initialSuccess = await attemptLoad()
      if (initialSuccess || cancelled) return
      
      // Show not found state and start retrying
      state.set({ 
        status: 'not_found', 
        message: "Couldn't find this workspace", 
        retrying: true 
      })
      
      // Retry with exponential backoff
      while (!cancelled) {
        retryCount++
        const delay = Math.min(1000 * Math.pow(2, retryCount - 1), maxRetryDelay)
        
        await new Promise(resolve => setTimeout(resolve, delay))
        if (cancelled) return
        
        const success = await attemptLoad()
        if (success) return
      }
    }
    
    // Start the loading process
    void retryLoop()
    
    // Return a readable store that cleans up on unsubscribe
    // Note: We can't easily cancel on unsubscribe with Svelte stores,
    // but the document will clean up when destroyed
    return readonly(state)
  }

  private handleCollaboratorChange() {
    this._isEditable.set(this.meta.isCollaborator(this.config.currentUser))
  }

  create(owner: string) {
    if (!this.meta.isEmpty) {
      throw new Error('Document already exists')
    }
    this.doc.transact(() => {
      this.meta.populate()
      this.meta.addCollaborator(owner)
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
