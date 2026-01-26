/**
 * Persistence module - IndexedDB-based persistence for Yjs documents
 * 
 * This module provides local persistence using a single database per user,
 * with separate object stores for each document. The user ID comes from
 * the JWT-verified identity provided by the signaling server.
 * 
 * Architecture:
 * - UserSession: Manages user identity lifecycle and persistence initialization
 * - PersistenceManager: High-level manager for document persistence
 * - UserDatabase: Manages a single IndexedDB per user
 * - DocumentPersistence: Syncs a Y.Doc to stores within the user's database
 * 
 * Usage:
 * ```ts
 * // Create session and try to restore from localStorage
 * const session = new UserSession()
 * await session.restore()  // Fast if localStorage has user
 * 
 * // When welcome message arrives from signaling
 * await session.handleWelcome(userId, role)
 * 
 * // Session is now ready - use persistence in SyncedDoc config
 * const config = { persistence: session.persistence, ... }
 * ```
 */

// Session management (combines identity + persistence lifecycle)
export {
  UserSession,
  type UserSessionOptions,
  type UserSessionEvents,
  type StoredSession
} from './UserSession.ts'

// High-level manager
export {
  PersistenceManager,
  type PersistenceManagerOptions,
  getDefaultPersistenceManager,
  resetDefaultPersistenceManager
} from './PersistenceManager.ts'

// Core classes
export { UserDatabase, type UserDatabaseOptions, type DocumentStoreInfo } from './UserDatabase.ts'
export { 
  DocumentPersistence, 
  type DocumentPersistenceOptions,
  type DocumentPersistenceEvents,
  PREFERRED_TRIM_SIZE,
  clearDocument,
  clearUserData
} from './DocumentPersistence.ts'

// Low-level IndexedDB utilities (for advanced use cases)
export * as indexeddb from './indexeddb.ts'
