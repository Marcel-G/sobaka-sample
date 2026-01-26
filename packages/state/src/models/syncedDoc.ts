import * as Y from 'yjs'
import { VerifiedRTCProvider } from '../networking/provider.ts'
import { DocMeta } from './docMeta.ts'
import { writable, type Readable } from 'svelte/store'
import type { SubDocReference } from '../util/subdoc.ts'
import { type PersistenceManager, type DocumentPersistence } from '../persistence/index.ts'
import type { SignalingClient } from '../networking/webrtc/SignalingClient.ts'
import { createLogger } from '../util/logger.ts'

const logger = createLogger('SyncedDoc')

/**
 * Well-known UUID for the global "Intro" workspace list.
 * This list is visible to all users (readonly) and editable by admins.
 * Each user's root document references this list at position 0.
 */
export const GLOBAL_INTRO_LIST_UUID = '00000000-0000-0000-0000-000000000001'

export interface Config {
  currentUser: string
  iceServers: IceServer[]
  signaling: string[]
  
  /**
   * Pre-connected SignalingClient instances to share with providers.
   * Takes precedence over signaling URLs if provided.
   */
  signalingClients?: SignalingClient[]
  
  /**
   * PersistenceManager instance for local storage.
   * Should be initialized with user ID from welcome message before creating SyncedDocs.
   */
  persistence?: PersistenceManager
  
  /**
   * Function to get initial state for a module type.
   * This is provided by the app's plugin registry.
   */
  getInitialState?: (type: string) => Record<string, unknown> | null
  
  /**
   * Reactive admin status. When true, user can edit global lists.
   */
  isAdmin?: Readable<boolean>
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
  private storage: DocumentPersistence | null = null
  private _isEditable = writable(false)
  private _isValid = writable(true)
  private _validationError: Error | null = null
  private _isAdmin = false
  private _unsubscribeAdmin?: () => void

  constructor(
    kind: K,
    doc: Y.Doc,
    public config: Config
  ) {
    this.doc = doc
    this.meta = new DocMeta(kind, this.doc.getMap('meta'))

    // Setup persistence if manager is provided and initialized
    if (config.persistence?.isInitialized) {
      this.storage = config.persistence.getDocumentPersistence(this.doc.guid, this.doc, {
        // Validate that updates from IndexedDB have the correct document kind
        // This prevents applying corrupt data that would break the document
        validateBeforeApply: (tempDoc: Y.Doc) => {
          const meta = tempDoc.getMap('meta')
          const storedKind = meta.get('kind')
          
          // If no kind stored yet, updates are valid (new document)
          if (storedKind === undefined) return true
          
          // Check if the kind matches
          if (storedKind !== kind) {
            logger.error(`Rejecting corrupt IndexedDB data for ${this.doc.guid}: stored kind="${storedKind}", expected="${kind}"`)
            return false
          }
          
          return true
        }
      })
    }
    
    this.rtc = new VerifiedRTCProvider(this.doc.guid, this.doc, {
      // Ignore updates from non-collaborators
      filterIncomingMessage: from => this.filterIncomingMessage(from),
      // Don't apply updates to invalid documents
      isDocumentValid: () => this._validationError === null,
      // Use pre-connected signaling clients if provided (shared with Global)
      signalingClients: config.signalingClients,
      signaling: config.signalingClients ? undefined : config.signaling,
      iceServers: config.iceServers
    })

    // Subscribe to admin status changes
    if (config.isAdmin) {
      this._unsubscribeAdmin = config.isAdmin.subscribe(isAdmin => {
        this._isAdmin = isAdmin
        this.handleCollaboratorChange()
      })
    }

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
      try {
        this.meta.validate()
        // Updates editable status based on collaborators
        this.meta.collaborators.observe(() => {
          this.handleCollaboratorChange()
        })
        this.handleCollaboratorChange()
      } catch (err) {
        // Mark document as invalid - wrong kind or corrupt data
        this._validationError = err as Error
        this._isValid.set(false)
        this._isEditable.set(false)
        
        // Log detailed error information for debugging
        const storedKind = this.doc.getMap('meta').get('kind')
        logger.error(`Invalid document ${this.doc.guid}:`, err)
        logger.error(`Document details: expected kind="${kind}", got kind="${storedKind}"`)
        
        // Destroy the storage to prevent persisting corrupt data
        // This forces a fresh sync from the network on next load
        if (this.storage) {
          logger.warn(`Clearing potentially corrupt local storage for ${this.doc.guid}`)
          this.storage.clearData().catch(clearErr => {
            logger.error('Failed to clear storage:', clearErr)
          })
          this.storage = null
        }
      }
    })

    // Update document meta when something changes
    this.doc.on('update', (_, origin) => {
      // Don't process updates if document is marked as invalid
      // This prevents corrupt data from being persisted
      if (this._validationError) return
      
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
    this._unsubscribeAdmin?.()
    this.storage?.destroy()
    this.rtc.destroy()
    this.doc.destroy()
  }

  /**
   * Clear local storage for this document.
   * Useful when corrupt data is detected and a fresh sync from network is needed.
   */
  public async clearLocalData(): Promise<void> {
    if (this.storage) {
      await this.storage.clearData()
      this.storage = null
    }
  }

  get isEditable(): Readable<boolean> {
    return this._isEditable
  }

  /**
   * Whether the document is valid (correct kind, not corrupted).
   * Invalid documents should not be displayed or edited.
   */
  get isValid(): Readable<boolean> {
    return this._isValid
  }

  /**
   * The validation error if the document is invalid.
   */
  get validationError(): Error | null {
    return this._validationError
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
    if (!this.storage) return
    if (this.storage.isSynced) return
    await this.storage.whenSynced
  }

  async load(options: Partial<{ localOnly: boolean }> = {}) {
    this.doc.load()
    if (!this.meta.isEmpty) {
      // Check if already validated as invalid
      if (this._validationError) {
        throw this._validationError
      }
      return
    }

    if (options.localOnly) {
      // Wait for local storage sync if available
      if (this.storage) {
        await this.storage.whenSynced
      }

      // Validation happens in synced() callback, check for errors
      if (this._validationError) {
        throw this._validationError
      }
      
      // If still empty after sync, validate will throw EmptyDocument
      if (this.meta.isEmpty) {
        this.meta.validate()
      }
      return
    }

    const signal = AbortSignal.timeout(30_000)
    await new Promise<void>((resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('Not found')))
      this.synced(resolve)
    })
    
    // Check for validation errors after syncing
    if (this._validationError) {
      throw this._validationError
    }
  }

  private handleCollaboratorChange() {
    // Don't check collaborators until document is synced
    if (this.meta.isEmpty) return
    
    const isCollaborator = this.meta.isCollaborator(this.config.currentUser)
    // Admins can edit the global intro list even if not collaborators
    const isGlobalIntro = this.doc.guid === GLOBAL_INTRO_LIST_UUID
    this._isEditable.set(isCollaborator || (isGlobalIntro && this._isAdmin))
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
