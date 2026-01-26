/**
 * PersistenceManager - Manages persistence for multiple documents
 * 
 * This provides a convenient interface for managing document persistence
 * within a user's database. It should be initialized with the user ID
 * from the welcome message (JWT-verified identity).
 * 
 * Usage:
 * ```ts
 * // On welcome message from signaling server
 * const persistence = new PersistenceManager()
 * await persistence.initialize(welcomeIdentity)
 * 
 * // For each document
 * const docPersistence = persistence.getDocumentPersistence(documentId, doc)
 * await docPersistence.whenSynced
 * ```
 */

import * as Y from 'yjs'
import { UserDatabase, type UserDatabaseOptions } from './UserDatabase.ts'
import { DocumentPersistence, type DocumentPersistenceOptions } from './DocumentPersistence.ts'
import { createLogger } from '../util/logger.ts'

const logger = createLogger('PersistenceManager')

// ============================================================================
// Types
// ============================================================================

export interface PersistenceManagerOptions {
  /** Optional custom store timeout for documents */
  storeTimeout?: number
  /** Called when database is being upgraded by another tab */
  onVersionChange?: () => void
}

// ============================================================================
// PersistenceManager
// ============================================================================

export class PersistenceManager {
  private userDatabase: UserDatabase | null = null
  private documentPersistence = new Map<string, DocumentPersistence>()
  private userId: string | null = null
  private options: PersistenceManagerOptions
  private initPromise: Promise<void> | null = null
  private destroyed = false
  
  constructor(options: PersistenceManagerOptions = {}) {
    this.options = options
  }
  
  // ============================================================================
  // Public API
  // ============================================================================
  
  /**
   * Initialize with user ID from welcome message
   */
  async initialize(userId: string): Promise<void> {
    if (this.destroyed) {
      throw new Error('PersistenceManager has been destroyed')
    }
    
    // If already initialized with same user, return
    if (this.userId === userId && this.userDatabase?.isOpen) {
      return
    }
    
    // If initializing with different user, destroy current
    if (this.userId && this.userId !== userId) {
      await this.destroyAsync()
    }
    
    // Prevent concurrent initialization
    if (this.initPromise) {
      await this.initPromise
      if (this.userId === userId) return
    }
    
    this.initPromise = this.doInitialize(userId)
    
    try {
      await this.initPromise
    } finally {
      this.initPromise = null
    }
  }
  
  /**
   * Check if initialized
   */
  get isInitialized(): boolean {
    return this.userDatabase !== null && this.userDatabase.isOpen
  }
  
  /**
   * Get the current user ID
   */
  get currentUserId(): string | null {
    return this.userId
  }
  
  /**
   * Get or create persistence for a document
   */
  getDocumentPersistence(
    documentId: string,
    doc: Y.Doc,
    options?: {
      /** Validate updates before applying to document. Return true to apply, false to reject. */
      validateBeforeApply?: (tempDoc: Y.Doc, updates: Uint8Array[]) => boolean
    }
  ): DocumentPersistence {
    if (!this.userDatabase) {
      throw new Error('PersistenceManager not initialized. Call initialize() first.')
    }
    
    // Check for existing persistence
    const existing = this.documentPersistence.get(documentId)
    if (existing && !existing.isDestroyed) {
      return existing
    }
    
    // Create new persistence
    const persistence = new DocumentPersistence(documentId, doc, {
      userDatabase: this.userDatabase,
      storeTimeout: this.options.storeTimeout,
      validateBeforeApply: options?.validateBeforeApply
    })
    
    this.documentPersistence.set(documentId, persistence)
    
    // Clean up when destroyed
    const originalDestroy = persistence.destroy.bind(persistence)
    persistence.destroy = () => {
      this.documentPersistence.delete(documentId)
      originalDestroy()
    }
    
    return persistence
  }
  
  /**
   * Check if persistence exists for a document
   */
  hasDocumentPersistence(documentId: string): boolean {
    const persistence = this.documentPersistence.get(documentId)
    return persistence !== undefined && !persistence.isDestroyed
  }
  
  /**
   * Destroy persistence for a specific document
   */
  destroyDocumentPersistence(documentId: string): void {
    const persistence = this.documentPersistence.get(documentId)
    if (persistence) {
      persistence.destroy()
      this.documentPersistence.delete(documentId)
    }
  }
  
  /**
   * Clear all data for a document
   */
  async clearDocumentData(documentId: string): Promise<void> {
    if (!this.userDatabase) {
      throw new Error('PersistenceManager not initialized')
    }
    
    // Destroy any active persistence first
    this.destroyDocumentPersistence(documentId)
    
    // Delete the stores
    await this.userDatabase.deleteDocumentStores(documentId)
  }
  
  /**
   * List all persisted documents
   */
  async listDocuments(): Promise<string[]> {
    if (!this.userDatabase) {
      throw new Error('PersistenceManager not initialized')
    }
    
    return this.userDatabase.listDocuments()
  }
  
  /**
   * Store all pending updates before closing
   */
  async flush(): Promise<void> {
    const promises: Promise<void>[] = []
    
    for (const persistence of this.documentPersistence.values()) {
      if (!persistence.isDestroyed) {
        promises.push(persistence.storeState())
      }
    }
    
    await Promise.all(promises)
  }
  
  /**
   * Destroy manager and clean up
   */
  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    
    // Destroy all document persistence instances
    for (const persistence of this.documentPersistence.values()) {
      persistence.destroy()
    }
    this.documentPersistence.clear()
    
    // Close user database
    if (this.userDatabase) {
      this.userDatabase.destroy()
      this.userDatabase = null
    }
    
    this.userId = null
    logger.log('Destroyed')
  }
  
  /**
   * Async version of destroy that flushes first
   */
  async destroyAsync(): Promise<void> {
    await this.flush()
    this.destroy()
  }
  
  /**
   * Delete all user data and destroy
   */
  async clearAllData(): Promise<void> {
    if (!this.userId) return
    
    const userId = this.userId
    this.destroy()
    
    await UserDatabase.deleteUserDatabase(userId)
    logger.log('Cleared all user data')
  }
  
  // ============================================================================
  // Private methods
  // ============================================================================
  
  private async doInitialize(userId: string): Promise<void> {
    this.userId = userId
    
    this.userDatabase = new UserDatabase({
      userId,
      onVersionChange: this.options.onVersionChange
    })
    
    await this.userDatabase.open()
    
    logger.log(`Initialized for user: ${userId}`)
  }
}

// ============================================================================
// Singleton for convenience
// ============================================================================

let defaultManager: PersistenceManager | null = null

/**
 * Get the default persistence manager instance
 */
export function getDefaultPersistenceManager(): PersistenceManager {
  if (!defaultManager) {
    defaultManager = new PersistenceManager()
  }
  return defaultManager
}

/**
 * Reset the default persistence manager (for testing)
 */
export function resetDefaultPersistenceManager(): void {
  if (defaultManager) {
    defaultManager.destroy()
    defaultManager = null
  }
}
