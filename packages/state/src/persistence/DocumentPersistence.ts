/**
 * DocumentPersistence - Yjs document persistence using IndexedDB
 * 
 * Syncs a Y.Doc to a specific object store within a UserDatabase.
 * Based on y-indexeddb but adapted for our multi-document-per-database architecture.
 * 
 * Features:
 * - Automatic debounced persistence of updates
 * - Periodic compaction to reduce storage size
 * - Custom metadata storage per document
 * - Observable sync status
 */

import * as Y from 'yjs'
import * as idb from './indexeddb.ts'
import { UserDatabase, type DocumentStoreInfo } from './UserDatabase.ts'
import { createLogger } from '../util/logger.ts'

const logger = createLogger('DocumentPersistence')

// ============================================================================
// Constants
// ============================================================================

/** Number of updates before triggering compaction */
export const PREFERRED_TRIM_SIZE = 500

/** Default debounce timeout for persisting updates (ms) */
const DEFAULT_STORE_TIMEOUT = 1000

/** Key for storing the document ID in the custom store */
const DOC_ID_KEY = '__document_id__'

// ============================================================================
// Types
// ============================================================================

export interface DocumentPersistenceOptions {
  /** UserDatabase instance to use */
  userDatabase: UserDatabase
  /** Debounce timeout for storing updates (ms) */
  storeTimeout?: number
  /**
   * Callback to validate updates before applying them to the document.
   * Receives the raw updates and a temporary doc with updates applied.
   * Return true to proceed with applying updates to the real doc.
   * Return false to reject the updates (they will be discarded and local storage cleared).
   */
  validateBeforeApply?: (tempDoc: Y.Doc, updates: Uint8Array[]) => boolean
}

export type DocumentPersistenceEvents = {
  /** Document has synced with IndexedDB */
  synced: (persistence: DocumentPersistence) => void
  /** Error occurred */
  error: (error: Error) => void
}

// ============================================================================
// EventEmitter for DocumentPersistence
// ============================================================================

type EventMap = {
  [K in keyof DocumentPersistenceEvents]: DocumentPersistenceEvents[K]
}

type EventCallback<K extends keyof EventMap> = EventMap[K]

// ============================================================================
// DocumentPersistence
// ============================================================================

/**
 * Persists a Y.Doc to IndexedDB using a UserDatabase.
 * 
 * Usage:
 * ```ts
 * const userDb = new UserDatabase({ userId: 'uuid-from-server' })
 * await userDb.open()
 * 
 * const doc = new Y.Doc()
 * const persistence = new DocumentPersistence('my-document', doc, {
 *   userDatabase: userDb
 * })
 * 
 * await persistence.whenSynced
 * // Document is now synced with IndexedDB
 * 
 * // Later...
 * persistence.destroy()
 * ```
 */
export class DocumentPersistence {
  readonly doc: Y.Doc
  readonly documentId: string
  readonly userDatabase: UserDatabase
  
  private storeInfo: DocumentStoreInfo | null = null
  private dbref: number = 0
  private dbsize: number = 0
  private destroyed = false
  private synced = false
  private storeTimeout: number
  private storeTimeoutId: ReturnType<typeof setTimeout> | null = null
  private validateBeforeApply?: (tempDoc: Y.Doc, updates: Uint8Array[]) => boolean
  
  private eventListeners = new Map<keyof EventMap, Set<EventCallback<keyof EventMap>>>()
  
  /** Promise that resolves when initial sync is complete */
  readonly whenSynced: Promise<DocumentPersistence>
  private resolveSynced!: (value: DocumentPersistence) => void
  
  constructor(
    documentId: string,
    doc: Y.Doc,
    options: DocumentPersistenceOptions
  ) {
    this.documentId = documentId
    this.doc = doc
    this.userDatabase = options.userDatabase
    this.storeTimeout = options.storeTimeout ?? DEFAULT_STORE_TIMEOUT
    this.validateBeforeApply = options.validateBeforeApply
    
    // Create synced promise
    this.whenSynced = new Promise((resolve) => {
      this.resolveSynced = resolve
    })
    
    // Setup listeners
    this.doc.on('update', this.onDocUpdate)
    this.doc.on('destroy', this.destroy)
    
    // Start initialization
    this.initialize()
  }
  
  // ============================================================================
  // Public API
  // ============================================================================
  
  /**
   * Check if synced with IndexedDB
   */
  get isSynced(): boolean {
    return this.synced
  }
  
  /**
   * Check if destroyed
   */
  get isDestroyed(): boolean {
    return this.destroyed
  }
  
  /**
   * Get a custom value stored with this document
   */
  async get<T>(key: string | number): Promise<T | undefined> {
    if (!this.storeInfo) {
      throw new Error('Not initialized')
    }
    
    const db = this.userDatabase.getDatabase()
    const transaction = idb.createTransaction(db, this.storeInfo.stores.custom, { mode: 'readonly' })
    const store = idb.getStore(transaction, this.storeInfo.stores.custom)
    
    return idb.get<T>(store, key)
  }
  
  /**
   * Set a custom value for this document
   */
  async set<T>(key: string | number, value: T): Promise<void> {
    if (!this.storeInfo) {
      throw new Error('Not initialized')
    }
    
    const db = this.userDatabase.getDatabase()
    const transaction = idb.createTransaction(db, this.storeInfo.stores.custom)
    const store = idb.getStore(transaction, this.storeInfo.stores.custom)
    
    await idb.put(store, value, key)
  }
  
  /**
   * Delete a custom value
   */
  async del(key: string | number): Promise<void> {
    if (!this.storeInfo) {
      throw new Error('Not initialized')
    }
    
    const db = this.userDatabase.getDatabase()
    const transaction = idb.createTransaction(db, this.storeInfo.stores.custom)
    const store = idb.getStore(transaction, this.storeInfo.stores.custom)
    
    await idb.del(store, key)
  }
  
  /**
   * Force store the current state (useful before closing)
   */
  async storeState(): Promise<void> {
    if (this.destroyed || !this.storeInfo) return
    
    await this.fetchAndCompact(true)
  }
  
  /**
   * Destroy the persistence and clean up
   */
  destroy = (): void => {
    if (this.destroyed) return
    this.destroyed = true
    
    // Clear pending timeout
    if (this.storeTimeoutId) {
      clearTimeout(this.storeTimeoutId)
      this.storeTimeoutId = null
    }
    
    // Remove listeners
    this.doc.off('update', this.onDocUpdate)
    this.doc.off('destroy', this.destroy)
    
    // Clear event listeners
    this.eventListeners.clear()
    
    logger.log(`Destroyed persistence for: ${this.documentId}`)
  }
  
  /**
   * Destroy and delete all persisted data for this document
   */
  async clearData(): Promise<void> {
    this.destroy()
    await this.userDatabase.deleteDocumentStores(this.documentId)
  }
  
  // ============================================================================
  // Event handling
  // ============================================================================
  
  on<K extends keyof EventMap>(event: K, callback: EventCallback<K>): void {
    let listeners = this.eventListeners.get(event)
    if (!listeners) {
      listeners = new Set()
      this.eventListeners.set(event, listeners)
    }
    listeners.add(callback as EventCallback<keyof EventMap>)
  }
  
  off<K extends keyof EventMap>(event: K, callback: EventCallback<K>): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.delete(callback as EventCallback<keyof EventMap>)
    }
  }
  
  private emit<K extends keyof EventMap>(event: K, ...args: Parameters<EventMap[K]>): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      for (const callback of listeners) {
        try {
          // @ts-expect-error - TypeScript can't infer the correct function signature
          callback(...args)
        } catch (err) {
          logger.error(`Error in ${event} listener:`, err)
        }
      }
    }
  }
  
  // ============================================================================
  // Private methods
  // ============================================================================
  
  private async initialize(): Promise<void> {
    try {
      // Wait for any pending database upgrade before starting
      await this.userDatabase.waitForUpgrade()
      
      if (this.destroyed || !this.userDatabase.isOpen) {
        logger.warn(`Database not ready for document: ${this.documentId}`)
        return
      }
      
      // Get or create stores for this document
      this.storeInfo = await this.userDatabase.getOrCreateDocumentStores(this.documentId)
      
      // Validate document ID to detect potential corruption
      const isValid = await this.validateDocumentId()
      if (!isValid) {
        logger.error(`Document ID mismatch detected for ${this.documentId} - possible data corruption`)
        // Don't apply potentially corrupted updates, but still mark as synced
        // so the application can proceed (network sync may have correct data)
        this.synced = true
        this.emit('synced', this)
        this.resolveSynced(this)
        return
      }
      
      // Fetch existing updates and apply them
      await this.fetchUpdates(
        // Before applying updates, store current doc state (async)
        // This merges our in-memory state with persisted state
        async () => {
          await this.storeInitialState()
        },
        // After applying updates, mark as synced
        () => {
          if (!this.destroyed) {
            this.synced = true
            this.emit('synced', this)
            this.resolveSynced(this)
          }
        }
      )
      
      logger.log(`Synced document: ${this.documentId}`)
    } catch (err) {
      logger.error(`Failed to initialize persistence for ${this.documentId}:`, err)
      this.emit('error', err as Error)
    }
  }
  
  /**
   * Validate that the stored document ID matches this document's ID.
   * This helps detect cross-document data corruption.
   * Returns true if valid (no stored ID, or ID matches), false if mismatch.
   */
  private async validateDocumentId(): Promise<boolean> {
    if (!this.storeInfo) return true
    
    try {
      const hasLock = await this.userDatabase.acquireOperationLock()
      if (!hasLock) return true
      
      const db = this.userDatabase.getDatabase()
      const transaction = idb.createTransaction(db, this.storeInfo.stores.custom, { mode: 'readonly' })
      const store = idb.getStore(transaction, this.storeInfo.stores.custom)
      
      const storedId = await idb.get<string>(store, DOC_ID_KEY)
      
      if (storedId === undefined) {
        // No stored ID yet - this is a new document, store the ID
        await this.storeDocumentId()
        return true
      }
      
      if (storedId !== this.documentId) {
        logger.error(`Document ID mismatch: stored=${storedId}, expected=${this.documentId}`)
        return false
      }
      
      return true
    } catch (err) {
      logger.warn('Failed to validate document ID:', err)
      // Return true to allow fallback to network sync
      return true
    }
  }
  
  /**
   * Store this document's ID in the custom store for future validation.
   */
  private async storeDocumentId(): Promise<void> {
    if (!this.storeInfo) return
    
    try {
      const hasLock = await this.userDatabase.acquireOperationLock()
      if (!hasLock) return
      
      const db = this.userDatabase.getDatabase()
      const transaction = idb.createTransaction(db, this.storeInfo.stores.custom)
      const store = idb.getStore(transaction, this.storeInfo.stores.custom)
      
      await idb.put(store, this.documentId, DOC_ID_KEY)
    } catch (err) {
      logger.warn('Failed to store document ID:', err)
    }
  }
  
  private async storeInitialState(): Promise<void> {
    if (this.destroyed || !this.storeInfo) return
    
    try {
      // Acquire operation lock to ensure database is ready
      const hasLock = await this.userDatabase.acquireOperationLock()
      if (!hasLock || this.destroyed) return
      
      const db = this.userDatabase.getDatabase()
      const transaction = idb.createTransaction(db, this.storeInfo.stores.updates)
      const store = idb.getStore(transaction, this.storeInfo.stores.updates)
      
      // Store current state as an update
      const update = Y.encodeStateAsUpdate(this.doc)
      idb.add(store, update)
    } catch (err) {
      logger.error('Failed to store initial state:', err)
    }
  }
  
  private async fetchUpdates(
    beforeApply?: () => void | Promise<void>,
    afterApply?: () => void
  ): Promise<boolean> {
    if (!this.storeInfo) return true
    
    // Acquire operation lock to ensure database is ready
    const hasLock = await this.userDatabase.acquireOperationLock()
    if (!hasLock || this.destroyed) return false
    
    const db = this.userDatabase.getDatabase()
    const transaction = idb.createTransaction(db, this.storeInfo.stores.updates, { mode: 'readonly' })
    const store = idb.getStore(transaction, this.storeInfo.stores.updates)
    
    // Get all updates after our current reference
    const range = idb.KeyRange.lowerBound(this.dbref, true)
    const updates = await idb.getAll<Uint8Array>(store, range)
    
    if (this.destroyed) return false
    
    // If we have a validation callback and there are updates, validate them first
    if (this.validateBeforeApply && updates.length > 0) {
      // Create a temporary doc and apply updates to it for validation
      const tempDoc = new Y.Doc()
      try {
        for (const update of updates) {
          Y.applyUpdate(tempDoc, update)
        }
        
        // Validate the temp doc
        const isValid = this.validateBeforeApply(tempDoc, updates)
        
        if (!isValid) {
          logger.warn(`Updates rejected by validation for document: ${this.documentId}`)
          tempDoc.destroy()
          
          // Clear the corrupt local storage
          await this.userDatabase.deleteDocumentStores(this.documentId)
          
          return false
        }
        
        tempDoc.destroy()
      } catch (err) {
        logger.error(`Validation error for document ${this.documentId}:`, err)
        tempDoc.destroy()
        
        // Clear corrupt data on validation error
        await this.userDatabase.deleteDocumentStores(this.documentId)
        
        return false
      }
    }
    
    // Call before callback (may be async now)
    await beforeApply?.()
    
    // Apply updates in a transaction
    Y.transact(this.doc, () => {
      for (const update of updates) {
        Y.applyUpdate(this.doc, update)
      }
    }, this, false)
    
    // Re-acquire lock in case beforeApply triggered an upgrade
    const hasLock2 = await this.userDatabase.acquireOperationLock()
    if (!hasLock2 || this.destroyed) return true
    
    // Update tracking - need to re-fetch since transaction may have expired
    const db2 = this.userDatabase.getDatabase()
    const transaction2 = idb.createTransaction(db2, this.storeInfo.stores.updates, { mode: 'readonly' })
    const store2 = idb.getStore(transaction2, this.storeInfo.stores.updates)
    
    const lastKey = await idb.getLastKey(store2)
    if (lastKey !== undefined) {
      this.dbref = (lastKey as number) + 1
    }
    
    this.dbsize = await idb.count(store2)
    
    // Call after callback
    afterApply?.()
    
    return true
  }
  
  private onDocUpdate = (update: Uint8Array, origin: unknown): void => {
    // Don't store updates that came from us (from IndexedDB)
    if (origin === this) return
    if (this.destroyed || !this.storeInfo) return
    
    const storeName = this.storeInfo.stores.updates
    
    // If database is upgrading or temporarily closed, queue the update
    if (this.userDatabase.queueUpdateIfUpgrading(storeName, update)) {
      this.dbsize++
      return
    }
    
    // Check if database is open before trying to access it
    if (!this.userDatabase.isOpen) {
      // Queue the update for later
      this.userDatabase.queueUpdateIfUpgrading(storeName, update)
      this.dbsize++
      return
    }
    
    try {
      const db = this.userDatabase.getDatabase()
      const transaction = idb.createTransaction(db, storeName)
      const store = idb.getStore(transaction, storeName)
      
      // Store the update
      idb.add(store, update)
      this.dbsize++
      
      // Check if we should compact
      if (this.dbsize >= PREFERRED_TRIM_SIZE) {
        this.scheduleCompaction()
      }
    } catch (err) {
      // If we get "Database not open", queue the update for later processing
      if (err instanceof Error && err.message.includes('not open')) {
        logger.warn('Database not ready, queueing update for:', this.documentId)
        this.userDatabase.queueUpdateIfUpgrading(storeName, update)
      } else {
        logger.error('Failed to store update:', err)
      }
    }
  }
  
  private scheduleCompaction(): void {
    // Debounce compaction
    if (this.storeTimeoutId !== null) {
      clearTimeout(this.storeTimeoutId)
    }
    
    this.storeTimeoutId = setTimeout(() => {
      this.storeTimeoutId = null
      this.fetchAndCompact(false)
    }, this.storeTimeout)
  }
  
  private async fetchAndCompact(force: boolean): Promise<void> {
    if (this.destroyed || !this.storeInfo) return
    
    // First, fetch any pending updates
    await this.fetchUpdates()
    
    if (force || this.dbsize >= PREFERRED_TRIM_SIZE) {
      await this.compact()
    }
  }
  
  private async compact(): Promise<void> {
    if (!this.storeInfo) return
    
    const db = this.userDatabase.getDatabase()
    const transaction = idb.createTransaction(db, this.storeInfo.stores.updates)
    const store = idb.getStore(transaction, this.storeInfo.stores.updates)
    
    // Add full state as new update
    const fullState = Y.encodeStateAsUpdate(this.doc)
    const newKey = await idb.add(store, fullState)
    
    // Delete all updates before this one (newKey should be a number since we use autoIncrement)
    const keyAsNumber = typeof newKey === 'number' ? newKey : Number(newKey)
    const range = idb.KeyRange.upperBound(keyAsNumber, true)
    await idb.del(store, range)
    
    // Update tracking
    this.dbref = keyAsNumber + 1
    this.dbsize = await idb.count(store)
    
    logger.log(`Compacted document ${this.documentId}: dbsize=${this.dbsize}`)
  }
}

// ============================================================================
// Helper functions
// ============================================================================

/**
 * Clear all data for a document (without needing to open the database)
 */
export async function clearDocument(userId: string, documentId: string): Promise<void> {
  const userDb = new UserDatabase({ userId })
  await userDb.open()
  
  try {
    await userDb.deleteDocumentStores(documentId)
  } finally {
    userDb.destroy()
  }
}

/**
 * Clear all data for a user
 */
export async function clearUserData(userId: string): Promise<void> {
  await UserDatabase.deleteUserDatabase(userId)
}
