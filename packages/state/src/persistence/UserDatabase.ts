/**
 * UserDatabase - Manages a single IndexedDB database per user
 * 
 * This provides a centralized database for all documents belonging to a user.
 * Each document gets its own object store within this database, avoiding the
 * overhead of multiple database connections.
 * 
 * The user UUID is assigned by the signaling server (from JWT verification)
 * and communicated via the welcome message. This allows:
 * - Fresh databases by assigning new UUIDs to users
 * - Future multi-tenant support
 * - Consistent identity across sessions
 */

import * as idb from './indexeddb.ts'
import { createLogger } from '../util/logger.ts'

const logger = createLogger('UserDatabase')

// ============================================================================
// Constants
// ============================================================================

/** Prefix for user databases */
const DB_PREFIX = 'sobaka-user-'

/** Meta store for tracking document stores and their versions */
const META_STORE = '__meta__'

/** Current meta store version */
const META_VERSION = 1

// ============================================================================
// Types
// ============================================================================

export interface DocumentStoreInfo {
  /** Document ID (used as store name prefix) */
  documentId: string
  /** Store names for this document */
  stores: {
    updates: string
    custom: string
  }
  /** When the document store was created */
  createdAt: number
  /** When the document store was last accessed */
  lastAccessedAt: number
}

export interface UserDatabaseOptions {
  /** User UUID from signaling server */
  userId: string
  /** Called when database is being upgraded by another tab */
  onVersionChange?: () => void
}

// ============================================================================
// UserDatabase
// ============================================================================

/**
 * Manages a single IndexedDB database for a user.
 * 
 * Usage:
 * ```ts
 * const userDb = new UserDatabase({ userId: 'uuid-from-server' })
 * await userDb.open()
 * 
 * // Get or create stores for a document
 * const stores = await userDb.getOrCreateDocumentStores('my-document-id')
 * 
 * // Use the stores...
 * 
 * await userDb.close()
 * ```
 */
export class UserDatabase {
  readonly userId: string
  readonly databaseName: string
  
  private db: IDBDatabase | null = null
  private version: number = 1
  private documentStores = new Map<string, DocumentStoreInfo>()
  private openPromise: Promise<void> | null = null
  private destroyed = false
  private onVersionChange?: () => void
  
  // Upgrade state management
  private upgrading = false
  private upgradePromise: Promise<void> | null = null
  private pendingUpdates: Array<{ storeName: string; data: Uint8Array }> = []
  
  // Operation lock to prevent concurrent database access during upgrades
  private operationQueue: Array<{
    resolve: () => void
    reject: (err: Error) => void
  }> = []
  private isProcessingOperation = false
  
  // Mutex for serializing store creation operations
  // Prevents race conditions when multiple documents try to create stores simultaneously
  private storeCreationQueue: Promise<void> = Promise.resolve()
  
  constructor(options: UserDatabaseOptions) {
    this.userId = options.userId
    this.databaseName = DB_PREFIX + options.userId
    this.onVersionChange = options.onVersionChange
  }
  
  // ============================================================================
  // Public API
  // ============================================================================
  
  /**
   * Open the database
   */
  async open(): Promise<void> {
    if (this.destroyed) {
      throw new Error('UserDatabase has been destroyed')
    }
    
    if (this.db) return
    
    // Prevent concurrent opens
    if (this.openPromise) {
      return this.openPromise
    }
    
    this.openPromise = this.doOpen()
    
    try {
      await this.openPromise
    } finally {
      this.openPromise = null
    }
  }
  
  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
    }
    this.documentStores.clear()
  }
  
  /**
   * Destroy the database and clean up
   */
  destroy(): void {
    this.destroyed = true
    this.close()
  }
  
  /**
   * Check if database is open
   */
  get isOpen(): boolean {
    return this.db !== null && !this.destroyed
  }
  
  /**
   * Check if database is currently upgrading (stores being created)
   */
  get isUpgrading(): boolean {
    return this.upgrading
  }
  
  /**
   * Wait for any pending upgrade to complete.
   * This should be called before any database operation that requires the db to be open.
   * It will wait for the current upgrade and any subsequent upgrades that start.
   */
  async waitForUpgrade(): Promise<void> {
    // Keep waiting while we're in an upgrading state or have an upgrade promise
    while (this.upgrading || this.upgradePromise) {
      if (this.upgradePromise) {
        await this.upgradePromise
      }
      // Small yield to allow other operations to set upgradePromise
      await new Promise(resolve => setTimeout(resolve, 0))
    }
  }
  
  /**
   * Acquire an operation lock. This ensures the database is open and no upgrades
   * are in progress. Returns true if the lock was acquired, false if the database
   * is destroyed or unavailable.
   */
  async acquireOperationLock(): Promise<boolean> {
    if (this.destroyed) return false
    
    // Wait for any pending upgrade
    await this.waitForUpgrade()
    
    // Check if database is available
    if (!this.db) return false
    
    return true
  }
  
  /**
   * Get the underlying IDBDatabase (throws if not open)
   */
  getDatabase(): IDBDatabase {
    if (!this.db) {
      throw new Error('Database not open')
    }
    return this.db
  }
  
  /**
   * Queue an update to be stored after the current upgrade completes.
   * Returns true if the update was queued (during upgrade or db closed), false if it should be stored immediately.
   */
  queueUpdateIfUpgrading(storeName: string, data: Uint8Array): boolean {
    // Queue if upgrading or if database is temporarily closed
    if (!this.upgrading && this.db !== null) {
      return false
    }
    
    this.pendingUpdates.push({ storeName, data })
    return true
  }
  
  /**
   * Get or create stores for a document.
   * 
   * This will increment the database version and create new object stores
   * if they don't exist for this document.
   * 
   * IMPORTANT: Store creation is serialized to prevent race conditions when
   * multiple documents are loaded concurrently. Without this, concurrent
   * database version upgrades could interfere with each other.
   */
  async getOrCreateDocumentStores(documentId: string): Promise<DocumentStoreInfo> {
    // Serialize store creation to prevent race conditions
    // Each call waits for the previous one to complete
    const previousOp = this.storeCreationQueue
    let resolveThis: () => void
    this.storeCreationQueue = new Promise(resolve => { resolveThis = resolve })
    
    try {
      await previousOp
      return await this.doGetOrCreateDocumentStores(documentId)
    } finally {
      resolveThis!()
    }
  }
  
  /**
   * Internal implementation of getOrCreateDocumentStores.
   * This is called within the serialization mutex.
   */
  private async doGetOrCreateDocumentStores(documentId: string): Promise<DocumentStoreInfo> {
    if (!this.db) {
      throw new Error('Database not open')
    }
    
    logger.log(`getOrCreateDocumentStores: documentId=${documentId}`)
    
    // Check if we already have stores for this document
    const existing = this.documentStores.get(documentId)
    if (existing) {
      // Update last accessed time
      await this.updateDocumentMeta(documentId, { lastAccessedAt: Date.now() })
      logger.log(`Found cached stores for: ${documentId}`)
      return existing
    }
    
    // Check if stores exist in database
    const storeNames = this.getDocumentStoreNames(documentId)
    const updatesExists = this.db ? idb.storeExists(this.db, storeNames.updates) : false
    const customExists = this.db ? idb.storeExists(this.db, storeNames.custom) : false
    
    logger.log(`Store check for ${documentId}: updates=${updatesExists}, custom=${customExists}`)
    
    if (updatesExists && customExists) {
      // Stores exist, just register them
      const info = await this.registerExistingStores(documentId, storeNames)
      logger.log(`Registered existing stores for: ${documentId}`)
      return info
    }
    
    // Need to create new stores - requires version upgrade
    logger.log(`Creating new stores for: ${documentId}`)
    await this.createDocumentStores(documentId, storeNames)
    
    const info = this.documentStores.get(documentId)
    if (!info) {
      throw new Error('Failed to create document stores')
    }
    
    logger.log(`Successfully created stores for: ${documentId}`)
    return info
  }
  
  /**
   * Check if stores exist for a document
   */
  hasDocumentStores(documentId: string): boolean {
    if (!this.db) return false
    
    const storeNames = this.getDocumentStoreNames(documentId)
    return idb.storeExists(this.db, storeNames.updates) && 
           idb.storeExists(this.db, storeNames.custom)
  }
  
  /**
   * Delete stores for a document
   */
  async deleteDocumentStores(documentId: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not open')
    }
    
    const storeNames = this.getDocumentStoreNames(documentId)
    
    if (!idb.storeExists(this.db, storeNames.updates)) {
      // Stores don't exist
      this.documentStores.delete(documentId)
      return
    }
    
    // Close current connection
    const currentVersion = this.db.version
    this.db.close()
    this.db = null
    
    // Reopen with higher version to delete stores
    this.version = currentVersion + 1
    
    this.db = await idb.openDatabase(this.databaseName, {
      version: this.version,
      onUpgrade: (db, _oldVersion, _newVersion, transaction) => {
        // Delete the document stores
        if (db.objectStoreNames.contains(storeNames.updates)) {
          db.deleteObjectStore(storeNames.updates)
        }
        if (db.objectStoreNames.contains(storeNames.custom)) {
          db.deleteObjectStore(storeNames.custom)
        }
        
        // Remove from meta store
        if (db.objectStoreNames.contains(META_STORE)) {
          const metaStore = transaction.objectStore(META_STORE)
          metaStore.delete(documentId)
        }
      },
      onVersionChange: () => {
        this.onVersionChange?.()
      }
    })
    
    this.documentStores.delete(documentId)
    logger.log(`Deleted stores for document: ${documentId}`)
  }
  
  /**
   * List all document IDs that have stores in this database
   */
  async listDocuments(): Promise<string[]> {
    if (!this.db) {
      throw new Error('Database not open')
    }
    
    if (!idb.storeExists(this.db, META_STORE)) {
      return []
    }
    
    const transaction = idb.createTransaction(this.db, META_STORE, { mode: 'readonly' })
    const store = idb.getStore(transaction, META_STORE)
    
    const keys = await idb.getAllKeys(store)
    return keys.filter(k => k !== '__version__').map(k => String(k))
  }
  
  /**
   * Delete the entire user database
   */
  static async deleteUserDatabase(userId: string): Promise<void> {
    const dbName = DB_PREFIX + userId
    await idb.deleteDatabase(dbName)
    logger.log(`Deleted database for user: ${userId}`)
  }
  
  /**
   * List all user databases
   */
  static async listUserDatabases(): Promise<string[]> {
    const databases = await indexedDB.databases()
    return databases
      .filter(db => db.name?.startsWith(DB_PREFIX))
      .map(db => db.name!.slice(DB_PREFIX.length))
  }
  
  // ============================================================================
  // Private methods
  // ============================================================================
  
  private async doOpen(): Promise<void> {
    logger.log(`Opening database: ${this.databaseName}`)
    
    // First, try to open without version to get current version
    const existingDb = await this.openExisting()
    
    if (existingDb) {
      this.db = existingDb
      this.version = existingDb.version
      await this.loadDocumentStoresFromMeta()
      logger.log(`Opened existing database v${this.version}`)
    } else {
      // Create new database
      await this.createNewDatabase()
      logger.log(`Created new database v${this.version}`)
    }
  }
  
  private async openExisting(): Promise<IDBDatabase | null> {
    return new Promise((resolve) => {
      const request = indexedDB.open(this.databaseName)
      
      request.onupgradeneeded = () => {
        // This is a new database, abort and let createNewDatabase handle it
        request.transaction?.abort()
      }
      
      request.onsuccess = () => {
        const db = request.result
        
        // Check if it's a valid database with meta store
        if (db.objectStoreNames.contains(META_STORE)) {
          db.onversionchange = () => {
            this.onVersionChange?.()
          }
          resolve(db)
        } else {
          // Invalid database, close and recreate
          db.close()
          resolve(null)
        }
      }
      
      request.onerror = () => {
        resolve(null)
      }
    })
  }
  
  private async createNewDatabase(): Promise<void> {
    this.version = 1
    
    this.db = await idb.openDatabase(this.databaseName, {
      version: this.version,
      onUpgrade: (db) => {
        // Create meta store
        const metaStore = db.createObjectStore(META_STORE)
        metaStore.put(META_VERSION, '__version__')
      },
      onVersionChange: () => {
        this.onVersionChange?.()
      }
    })
  }
  
  private async loadDocumentStoresFromMeta(): Promise<void> {
    if (!this.db || !idb.storeExists(this.db, META_STORE)) return
    
    const transaction = idb.createTransaction(this.db, META_STORE, { mode: 'readonly' })
    const store = idb.getStore(transaction, META_STORE)
    
    await idb.iterate<DocumentStoreInfo>(store, (value, key) => {
      if (key !== '__version__' && value && typeof value === 'object') {
        this.documentStores.set(String(key), value)
      }
    })
  }
  
  private getDocumentStoreNames(documentId: string): { updates: string; custom: string } {
    // Use a safe encoding for the document ID in store names
    const safeId = this.encodeDocumentId(documentId)
    return {
      updates: `doc_${safeId}_updates`,
      custom: `doc_${safeId}_custom`
    }
  }
  
  private encodeDocumentId(documentId: string): string {
    // Simple encoding: replace non-alphanumeric chars with underscore
    // For most UUIDs this is a no-op
    return documentId.replace(/[^a-zA-Z0-9-]/g, '_')
  }
  
  private async registerExistingStores(
    documentId: string,
    storeNames: { updates: string; custom: string }
  ): Promise<DocumentStoreInfo> {
    const now = Date.now()
    
    const info: DocumentStoreInfo = {
      documentId,
      stores: storeNames,
      createdAt: now,
      lastAccessedAt: now
    }
    
    // Try to load existing meta
    if (this.db && idb.storeExists(this.db, META_STORE)) {
      const transaction = idb.createTransaction(this.db, META_STORE, { mode: 'readonly' })
      const store = idb.getStore(transaction, META_STORE)
      const existing = await idb.get<DocumentStoreInfo>(store, documentId)
      
      if (existing) {
        info.createdAt = existing.createdAt
      }
    }
    
    this.documentStores.set(documentId, info)
    
    // Update meta
    await this.updateDocumentMeta(documentId, { lastAccessedAt: now })
    
    return info
  }
  
  private async createDocumentStores(
    documentId: string,
    storeNames: { updates: string; custom: string }
  ): Promise<void> {
    if (!this.db) {
      throw new Error('Database not open')
    }
    
    // Set upgrading flag to queue updates during version change
    this.upgrading = true
    
    // Create a promise that resolves when upgrade is complete
    let resolveUpgrade: () => void
    this.upgradePromise = new Promise(resolve => {
      resolveUpgrade = resolve
    })
    
    try {
      // Close current connection
      const currentVersion = this.db.version
      this.db.close()
      this.db = null
      
      // Increment version for schema change
      this.version = currentVersion + 1
      
      const now = Date.now()
      const info: DocumentStoreInfo = {
        documentId,
        stores: storeNames,
        createdAt: now,
        lastAccessedAt: now
      }
      
      // Reopen with new version
      this.db = await idb.openDatabase(this.databaseName, {
        version: this.version,
        onUpgrade: (db, _oldVersion, _newVersion, transaction) => {
          // Create updates store with auto-increment keys
          db.createObjectStore(storeNames.updates, { autoIncrement: true })
          
          // Create custom store for metadata
          db.createObjectStore(storeNames.custom)
          
          // Update meta store
          if (db.objectStoreNames.contains(META_STORE)) {
            const metaStore = transaction.objectStore(META_STORE)
            metaStore.put(info, documentId)
          }
        },
        onVersionChange: () => {
          this.onVersionChange?.()
        }
      })
      
      this.documentStores.set(documentId, info)
      logger.log(`Created stores for document: ${documentId}`)
      
      // Flush any pending updates that were queued during the upgrade
      await this.flushPendingUpdates()
    } finally {
      this.upgrading = false
      this.upgradePromise = null
      resolveUpgrade!()
    }
  }
  
  /**
   * Flush updates that were queued during the version upgrade
   */
  private async flushPendingUpdates(): Promise<void> {
    if (this.pendingUpdates.length === 0) return
    
    const updates = this.pendingUpdates
    this.pendingUpdates = []
    
    logger.log(`Flushing ${updates.length} pending updates`)
    
    for (const { storeName, data } of updates) {
      try {
        if (this.db && idb.storeExists(this.db, storeName)) {
          const transaction = idb.createTransaction(this.db, storeName)
          const store = idb.getStore(transaction, storeName)
          await idb.add(store, data)
        }
      } catch (err) {
        logger.error('Failed to flush pending update:', err)
      }
    }
  }
  
  private async updateDocumentMeta(
    documentId: string,
    updates: Partial<DocumentStoreInfo>
  ): Promise<void> {
    if (!this.db || !idb.storeExists(this.db, META_STORE)) return
    
    const info = this.documentStores.get(documentId)
    if (!info) return
    
    Object.assign(info, updates)
    
    const transaction = idb.createTransaction(this.db, META_STORE)
    const store = idb.getStore(transaction, META_STORE)
    await idb.put(store, info, documentId)
  }
}
