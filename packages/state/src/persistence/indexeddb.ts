/**
 * IndexedDB utilities with modern TypeScript patterns
 * 
 * A clean, typed wrapper around IndexedDB operations. Designed to be
 * more ergonomic than the raw IndexedDB API while remaining lightweight.
 */

// ============================================================================
// Types
// ============================================================================

export type IDBKeyType = string | number | Date | ArrayBuffer | IDBKeyType[]

export interface StoreDefinition {
  name: string
  options?: IDBObjectStoreParameters
  indexes?: Array<{
    name: string
    keyPath: string | string[]
    options?: IDBIndexParameters
  }>
}

export interface TransactionOptions {
  mode?: IDBTransactionMode
  durability?: 'default' | 'strict' | 'relaxed'
}

// ============================================================================
// Promise wrappers
// ============================================================================

/**
 * Convert an IDBRequest to a Promise
 */
export function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Wait for an IDBTransaction to complete
 */
export function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(new Error('Transaction aborted'))
  })
}

// ============================================================================
// Database operations
// ============================================================================

export interface OpenDatabaseOptions {
  /** Current database version */
  version: number
  /** Called when database needs to be upgraded */
  onUpgrade: (db: IDBDatabase, oldVersion: number, newVersion: number, transaction: IDBTransaction) => void
  /** Called if another connection is blocking version change */
  onBlocked?: () => void
  /** Called if another connection triggered version change */
  onVersionChange?: (db: IDBDatabase) => void
}

/**
 * Open or create an IndexedDB database
 */
export function openDatabase(name: string, options: OpenDatabaseOptions): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, options.version)
    
    request.onupgradeneeded = (event) => {
      const db = request.result
      const transaction = request.transaction!
      options.onUpgrade(db, event.oldVersion, event.newVersion ?? options.version, transaction)
    }
    
    request.onsuccess = () => {
      const db = request.result
      
      // Handle version change from other connections
      db.onversionchange = () => {
        if (options.onVersionChange) {
          options.onVersionChange(db)
        } else {
          // Default: close the connection to allow upgrade
          db.close()
        }
      }
      
      resolve(db)
    }
    
    request.onerror = () => reject(request.error)
    
    request.onblocked = () => {
      if (options.onBlocked) {
        options.onBlocked()
      }
    }
  })
}

/**
 * Delete a database
 */
export function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * Check if a database exists
 */
export async function databaseExists(name: string): Promise<boolean> {
  const databases = await indexedDB.databases()
  return databases.some(db => db.name === name)
}

// ============================================================================
// Store operations
// ============================================================================

/**
 * Create an object store with optional indexes
 */
export function createStore(db: IDBDatabase, definition: StoreDefinition): IDBObjectStore {
  const store = db.createObjectStore(definition.name, definition.options)
  
  if (definition.indexes) {
    for (const index of definition.indexes) {
      store.createIndex(index.name, index.keyPath, index.options)
    }
  }
  
  return store
}

/**
 * Delete an object store
 */
export function deleteStore(db: IDBDatabase, name: string): void {
  db.deleteObjectStore(name)
}

/**
 * Check if an object store exists
 */
export function storeExists(db: IDBDatabase, name: string): boolean {
  return db.objectStoreNames.contains(name)
}

/**
 * Get all object store names
 */
export function getStoreNames(db: IDBDatabase): string[] {
  return Array.from(db.objectStoreNames)
}

// ============================================================================
// Transaction helpers
// ============================================================================

/**
 * Create a transaction and get stores
 */
export function createTransaction(
  db: IDBDatabase,
  storeNames: string | string[],
  options: TransactionOptions = {}
): IDBTransaction {
  const names = Array.isArray(storeNames) ? storeNames : [storeNames]
  const mode = options.mode ?? 'readwrite'
  
  return db.transaction(names, mode, { durability: options.durability ?? 'default' })
}

/**
 * Get a store from a transaction
 */
export function getStore(transaction: IDBTransaction, name: string): IDBObjectStore {
  return transaction.objectStore(name)
}

// ============================================================================
// CRUD operations
// ============================================================================

/**
 * Get a value by key
 */
export function get<T>(store: IDBObjectStore, key: IDBKeyType): Promise<T | undefined> {
  return requestToPromise(store.get(key as IDBValidKey)) as Promise<T | undefined>
}

/**
 * Get all values (optionally filtered by key range)
 */
export function getAll<T>(
  store: IDBObjectStore,
  query?: IDBKeyRange | null,
  count?: number
): Promise<T[]> {
  return requestToPromise(store.getAll(query ?? undefined, count)) as Promise<T[]>
}

/**
 * Get all keys
 */
export function getAllKeys(
  store: IDBObjectStore,
  query?: IDBKeyRange | null,
  count?: number
): Promise<IDBValidKey[]> {
  return requestToPromise(store.getAllKeys(query ?? undefined, count))
}

/**
 * Put a value (insert or update)
 */
export function put<T>(
  store: IDBObjectStore,
  value: T,
  key?: IDBKeyType
): Promise<IDBValidKey> {
  return requestToPromise(store.put(value, key as IDBValidKey | undefined))
}

/**
 * Add a value (insert only, fails if key exists)
 */
export function add<T>(
  store: IDBObjectStore,
  value: T,
  key?: IDBKeyType
): Promise<IDBValidKey> {
  return requestToPromise(store.add(value, key as IDBValidKey | undefined))
}

/**
 * Delete a value by key
 */
export function del(store: IDBObjectStore, key: IDBKeyType | IDBKeyRange): Promise<void> {
  return requestToPromise(store.delete(key as IDBValidKey | IDBKeyRange))
}

/**
 * Clear all values in a store
 */
export function clear(store: IDBObjectStore): Promise<void> {
  return requestToPromise(store.clear())
}

/**
 * Count values (optionally filtered by key range)
 */
export function count(store: IDBObjectStore, query?: IDBKeyRange): Promise<number> {
  return requestToPromise(store.count(query))
}

// ============================================================================
// Cursor operations
// ============================================================================

export type CursorCallback<T> = (value: T, key: IDBValidKey) => boolean | void | Promise<boolean | void>

/**
 * Iterate over values with a cursor
 * Return false from callback to stop iteration
 */
export async function iterate<T>(
  store: IDBObjectStore,
  callback: CursorCallback<T>,
  query?: IDBKeyRange | null,
  direction: IDBCursorDirection = 'next'
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = store.openCursor(query ?? undefined, direction)
    
    request.onsuccess = async () => {
      const cursor = request.result
      if (!cursor) {
        resolve()
        return
      }
      
      try {
        const shouldContinue = await callback(cursor.value as T, cursor.key)
        if (shouldContinue === false) {
          resolve()
        } else {
          cursor.continue()
        }
      } catch (err) {
        reject(err)
      }
    }
    
    request.onerror = () => reject(request.error)
  })
}

/**
 * Iterate over keys only (more efficient when you don't need values)
 */
export async function iterateKeys(
  store: IDBObjectStore,
  callback: (key: IDBValidKey) => boolean | void | Promise<boolean | void>,
  query?: IDBKeyRange | null,
  direction: IDBCursorDirection = 'next'
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = store.openKeyCursor(query ?? undefined, direction)
    
    request.onsuccess = async () => {
      const cursor = request.result
      if (!cursor) {
        resolve()
        return
      }
      
      try {
        const shouldContinue = await callback(cursor.key)
        if (shouldContinue === false) {
          resolve()
        } else {
          cursor.continue()
        }
      } catch (err) {
        reject(err)
      }
    }
    
    request.onerror = () => reject(request.error)
  })
}

/**
 * Get the first key (useful for getting min/max with direction)
 */
export async function getFirstKey(
  store: IDBObjectStore,
  query?: IDBKeyRange | null,
  direction: IDBCursorDirection = 'next'
): Promise<IDBValidKey | undefined> {
  return new Promise((resolve, reject) => {
    const request = store.openKeyCursor(query ?? undefined, direction)
    
    request.onsuccess = () => {
      const cursor = request.result
      resolve(cursor?.key)
    }
    
    request.onerror = () => reject(request.error)
  })
}

/**
 * Get the last key
 */
export function getLastKey(
  store: IDBObjectStore,
  query?: IDBKeyRange | null
): Promise<IDBValidKey | undefined> {
  return getFirstKey(store, query, 'prev')
}

// ============================================================================
// Key range helpers
// ============================================================================

export const KeyRange = {
  /** Only keys equal to value */
  only: (value: IDBKeyType) => IDBKeyRange.only(value as IDBValidKey),
  
  /** Keys >= lower (or > if lowerOpen) */
  lowerBound: (lower: IDBKeyType, open = false) => 
    IDBKeyRange.lowerBound(lower as IDBValidKey, open),
  
  /** Keys <= upper (or < if upperOpen) */
  upperBound: (upper: IDBKeyType, open = false) => 
    IDBKeyRange.upperBound(upper as IDBValidKey, open),
  
  /** Keys between lower and upper */
  bound: (lower: IDBKeyType, upper: IDBKeyType, lowerOpen = false, upperOpen = false) =>
    IDBKeyRange.bound(lower as IDBValidKey, upper as IDBValidKey, lowerOpen, upperOpen)
}
