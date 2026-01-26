/**
 * UserSession - Manages user identity and persistence lifecycle
 * 
 * This handles the flow where:
 * 1. On fresh load, no JWT/UUID exists - wait for welcome message
 * 2. Store UUID in localStorage for instant reloads
 * 3. On subsequent loads, use localStorage values immediately
 * 4. If welcome message has conflicting info, update and reinitialize
 * 
 * The user UUID comes from the signaling server (verified from JWT).
 * This UUID is used as the database name for persistence.
 */

import { PersistenceManager, type PersistenceManagerOptions } from './PersistenceManager.ts'
import { createLogger } from '../util/logger.ts'

const logger = createLogger('UserSession')

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = 'sobaka-user-session'

// ============================================================================
// Types
// ============================================================================

export interface StoredSession {
  /** User UUID from signaling server */
  userId: string
  /** User role (client, worker, admin) */
  role: 'client' | 'worker' | 'admin'
  /** When the session was last verified */
  verifiedAt: number
}

export type UserSessionEvents = {
  /** Session is ready (persistence initialized) */
  ready: () => void
  /** User identity changed (reinitializing) */
  identityChanged: (oldUserId: string | null, newUserId: string) => void
  /** Role changed */
  roleChanged: (role: 'client' | 'worker' | 'admin') => void
  /** Error occurred */
  error: (error: Error) => void
}

export interface UserSessionOptions extends PersistenceManagerOptions {
  /** Custom storage key for localStorage */
  storageKey?: string
}

// ============================================================================
// Event handling
// ============================================================================

type EventCallback<K extends keyof UserSessionEvents> = UserSessionEvents[K]

// ============================================================================
// UserSession
// ============================================================================

/**
 * Manages the user session lifecycle including identity and persistence.
 * 
 * Usage:
 * ```ts
 * const session = new UserSession()
 * 
 * // Try to restore from localStorage (instant if available)
 * const restored = await session.restore()
 * 
 * // When welcome message arrives from signaling
 * await session.handleWelcome(userId, role)
 * 
 * // Session is now ready
 * const persistence = session.persistence
 * ```
 */
export class UserSession {
  private _persistence: PersistenceManager
  private _session: StoredSession | null = null
  private _isReady = false
  private _isVerified = false
  private storageKey: string
  private destroyed = false
  
  private eventListeners = new Map<keyof UserSessionEvents, Set<EventCallback<keyof UserSessionEvents>>>()
  
  constructor(options: UserSessionOptions = {}) {
    this.storageKey = options.storageKey ?? STORAGE_KEY
    this._persistence = new PersistenceManager(options)
  }
  
  // ============================================================================
  // Public API
  // ============================================================================
  
  /**
   * Attempt to restore session from localStorage.
   * If successful, persistence is initialized immediately for fast startup.
   * Returns true if a session was restored (or already ready).
   */
  async restore(): Promise<boolean> {
    if (this.destroyed) return false
    
    // Already ready (e.g., welcome message arrived first)
    if (this._isReady) {
      logger.log('Session already ready, skipping restore')
      return true
    }
    
    const stored = this.readFromStorage()
    if (!stored) {
      logger.log('No stored session found')
      return false
    }
    
    logger.log('Restoring session for user:', stored.userId)
    
    try {
      this._session = stored
      await this._persistence.initialize(stored.userId)
      this._isReady = true
      this.emit('ready')
      logger.log('Session restored (unverified)')
      return true
    } catch (err) {
      logger.error('Failed to restore session:', err)
      this._session = null
      this.emit('error', err as Error)
      return false
    }
  }
  
  /**
   * Handle welcome message from signaling server.
   * This provides the verified user identity and role.
   * 
   * If the identity differs from localStorage, persistence is reinitialized.
   */
  async handleWelcome(userId: string, role: 'client' | 'worker' | 'admin'): Promise<void> {
    if (this.destroyed) return
    
    const oldUserId = this._session?.userId ?? null
    const identityChanged = oldUserId !== null && oldUserId !== userId
    
    if (identityChanged) {
      logger.log('Identity changed:', oldUserId, '->', userId)
      
      // Destroy old persistence and reinitialize with new identity
      await this._persistence.destroyAsync()
      this._persistence = new PersistenceManager()
      this._isReady = false
      
      this.emit('identityChanged', oldUserId, userId)
    }
    
    // Update session
    const newSession: StoredSession = {
      userId,
      role,
      verifiedAt: Date.now()
    }
    
    this._session = newSession
    this._isVerified = true
    this.writeToStorage(newSession)
    
    // Emit role change if role differs
    if (this._session?.role !== role) {
      this.emit('roleChanged', role)
    }
    
    // Initialize persistence if not already ready (or was reset due to identity change)
    if (!this._isReady) {
      try {
        await this._persistence.initialize(userId)
        this._isReady = true
        this.emit('ready')
        logger.log('Session ready (verified)')
      } catch (err) {
        logger.error('Failed to initialize persistence:', err)
        this.emit('error', err as Error)
        throw err
      }
    } else {
      logger.log('Session verified')
    }
  }
  
  /**
   * Check if session is ready (persistence initialized)
   */
  get isReady(): boolean {
    return this._isReady
  }
  
  /**
   * Check if session has been verified by signaling server
   */
  get isVerified(): boolean {
    return this._isVerified
  }
  
  /**
   * Get the current user ID (null if not yet available)
   */
  get userId(): string | null {
    return this._session?.userId ?? null
  }
  
  /**
   * Get the current user role (null if not yet available)
   */
  get role(): 'client' | 'worker' | 'admin' | null {
    return this._session?.role ?? null
  }
  
  /**
   * Get the persistence manager.
   * Throws if session is not ready.
   */
  get persistence(): PersistenceManager {
    if (!this._isReady) {
      throw new Error('Session not ready. Call restore() or handleWelcome() first.')
    }
    return this._persistence
  }
  
  /**
   * Get the persistence manager if ready, or null.
   */
  get persistenceOrNull(): PersistenceManager | null {
    return this._isReady ? this._persistence : null
  }
  
  /**
   * Wait for session to be ready.
   * Resolves immediately if already ready.
   */
  whenReady(): Promise<void> {
    if (this._isReady) {
      return Promise.resolve()
    }
    
    return new Promise((resolve, reject) => {
      const onReady = () => {
        this.off('ready', onReady)
        this.off('error', onError)
        resolve()
      }
      
      const onError = (err: Error) => {
        this.off('ready', onReady)
        this.off('error', onError)
        reject(err)
      }
      
      this.on('ready', onReady)
      this.on('error', onError)
    })
  }
  
  /**
   * Destroy session and clean up
   */
  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    
    this._persistence.destroy()
    this.eventListeners.clear()
    this._session = null
    this._isReady = false
    this._isVerified = false
  }
  
  /**
   * Async version that flushes persistence first
   */
  async destroyAsync(): Promise<void> {
    if (this.destroyed) return
    await this._persistence.flush()
    this.destroy()
  }
  
  /**
   * Clear session from localStorage and destroy
   */
  async clearSession(): Promise<void> {
    this.clearStorage()
    await this._persistence.clearAllData()
    this.destroy()
  }
  
  // ============================================================================
  // Event handling
  // ============================================================================
  
  on<K extends keyof UserSessionEvents>(event: K, callback: EventCallback<K>): void {
    let listeners = this.eventListeners.get(event)
    if (!listeners) {
      listeners = new Set()
      this.eventListeners.set(event, listeners)
    }
    listeners.add(callback as EventCallback<keyof UserSessionEvents>)
  }
  
  off<K extends keyof UserSessionEvents>(event: K, callback: EventCallback<K>): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.delete(callback as EventCallback<keyof UserSessionEvents>)
    }
  }
  
  once<K extends keyof UserSessionEvents>(event: K, callback: EventCallback<K>): void {
    const wrapper = ((...args: Parameters<EventCallback<K>>) => {
      this.off(event, wrapper as EventCallback<K>)
      // @ts-expect-error - TypeScript can't infer the correct function signature
      callback(...args)
    }) as EventCallback<K>
    
    this.on(event, wrapper)
  }
  
  private emit<K extends keyof UserSessionEvents>(event: K, ...args: Parameters<UserSessionEvents[K]>): void {
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
  // Storage
  // ============================================================================
  
  private readFromStorage(): StoredSession | null {
    if (typeof localStorage === 'undefined') {
      return null
    }
    
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (!stored) return null
      
      const session = JSON.parse(stored) as StoredSession
      
      // Validate required fields
      if (!session.userId || typeof session.userId !== 'string') {
        return null
      }
      
      return session
    } catch {
      return null
    }
  }
  
  private writeToStorage(session: StoredSession): void {
    if (typeof localStorage === 'undefined') {
      return
    }
    
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(session))
    } catch (err) {
      logger.warn('Failed to write session to localStorage:', err)
    }
  }
  
  private clearStorage(): void {
    if (typeof localStorage === 'undefined') {
      return
    }
    
    try {
      localStorage.removeItem(this.storageKey)
    } catch (err) {
      logger.warn('Failed to clear session from localStorage:', err)
    }
  }
}
