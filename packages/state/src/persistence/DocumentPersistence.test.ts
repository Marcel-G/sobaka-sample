/**
 * Tests for DocumentPersistence
 * 
 * These tests use fake-indexeddb to simulate IndexedDB in Node.js
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as Y from 'yjs'

// Mock IndexedDB before importing our modules
import 'fake-indexeddb/auto'

import { UserDatabase } from './UserDatabase.ts'
import { DocumentPersistence, PREFERRED_TRIM_SIZE } from './DocumentPersistence.ts'

describe('DocumentPersistence', () => {
  let userDb: UserDatabase
  let testUserId: string
  
  beforeEach(async () => {
    // Use a unique user ID for each test to avoid conflicts
    testUserId = 'test-user-' + Math.random().toString(36).slice(2) + '-' + Date.now()
    userDb = new UserDatabase({ userId: testUserId })
    await userDb.open()
  }, 10000)
  
  afterEach(async () => {
    // Close the database first
    userDb.destroy()
    
    // Small delay to ensure cleanup
    await new Promise(resolve => setTimeout(resolve, 50))
    
    // Try to delete, but don't fail if it doesn't work
    try {
      await UserDatabase.deleteUserDatabase(testUserId)
    } catch {
      // Ignore delete errors in tests
    }
  }, 10000)
  
  it('should sync a new document', async () => {
    const doc = new Y.Doc()
    const persistence = new DocumentPersistence('test-doc', doc, { userDatabase: userDb })
    
    await persistence.whenSynced
    
    expect(persistence.isSynced).toBe(true)
    
    persistence.destroy()
    doc.destroy()
  })
  
  it('should persist and restore document state', async () => {
    const docId = 'persist-test-' + Math.random().toString(36).slice(2)
    
    // Create and modify first document
    const doc1 = new Y.Doc()
    const array1 = doc1.getArray('test')
    array1.insert(0, ['hello', 'world'])
    
    const persistence1 = new DocumentPersistence(docId, doc1, { userDatabase: userDb })
    await persistence1.whenSynced
    
    // Store state before destroying
    await persistence1.storeState()
    persistence1.destroy()
    
    // Create second document with same ID
    const doc2 = new Y.Doc()
    const persistence2 = new DocumentPersistence(docId, doc2, { userDatabase: userDb })
    await persistence2.whenSynced
    
    const array2 = doc2.getArray('test')
    expect(array2.toArray()).toEqual(['hello', 'world'])
    
    persistence2.destroy()
    doc1.destroy()
    doc2.destroy()
  })
  
  it('should persist updates from local changes', async () => {
    const docId = 'update-test-' + Math.random().toString(36).slice(2)
    
    const doc = new Y.Doc()
    const persistence = new DocumentPersistence(docId, doc, { userDatabase: userDb })
    await persistence.whenSynced
    
    // Make changes after sync
    const map = doc.getMap('data')
    map.set('key1', 'value1')
    map.set('key2', 42)
    
    // Store and reload
    await persistence.storeState()
    persistence.destroy()
    
    // Verify persistence
    const doc2 = new Y.Doc()
    const persistence2 = new DocumentPersistence(docId, doc2, { userDatabase: userDb })
    await persistence2.whenSynced
    
    const map2 = doc2.getMap('data')
    expect(map2.get('key1')).toBe('value1')
    expect(map2.get('key2')).toBe(42)
    
    persistence2.destroy()
    doc.destroy()
    doc2.destroy()
  })
  
  it('should handle custom metadata storage', async () => {
    const doc = new Y.Doc()
    const persistence = new DocumentPersistence('meta-test', doc, { userDatabase: userDb })
    await persistence.whenSynced
    
    // Set custom metadata
    await persistence.set('lastOpened', Date.now())
    await persistence.set('settings', { theme: 'dark', fontSize: 14 })
    
    // Get custom metadata
    const lastOpened = await persistence.get<number>('lastOpened')
    const settings = await persistence.get<{ theme: string; fontSize: number }>('settings')
    
    expect(typeof lastOpened).toBe('number')
    expect(settings).toEqual({ theme: 'dark', fontSize: 14 })
    
    // Delete custom metadata
    await persistence.del('lastOpened')
    expect(await persistence.get('lastOpened')).toBeUndefined()
    
    persistence.destroy()
    doc.destroy()
  })
  
  it('should emit synced event', async () => {
    const doc = new Y.Doc()
    const syncedHandler = vi.fn()
    
    const persistence = new DocumentPersistence('event-test', doc, { userDatabase: userDb })
    persistence.on('synced', syncedHandler)
    
    await persistence.whenSynced
    
    expect(syncedHandler).toHaveBeenCalledTimes(1)
    expect(syncedHandler).toHaveBeenCalledWith(persistence)
    
    persistence.destroy()
    doc.destroy()
  })
  
  it('should handle early destroy', async () => {
    // Use a separate database for this test to avoid contaminating the shared one
    const earlyDestroyUserId = 'early-destroy-user-' + Date.now()
    const earlyDestroyDb = new UserDatabase({ userId: earlyDestroyUserId })
    await earlyDestroyDb.open()
    
    const doc = new Y.Doc()
    const persistence = new DocumentPersistence('early-destroy', doc, { userDatabase: earlyDestroyDb })
    
    // Destroy immediately before sync completes
    persistence.destroy()
    
    expect(persistence.isDestroyed).toBe(true)
    
    doc.destroy()
    earlyDestroyDb.destroy()
  }, 5000)
  
  it('should clear document data', async () => {
    const docId = 'clear-test-' + Math.random().toString(36).slice(2)
    
    const doc = new Y.Doc()
    const array = doc.getArray('test')
    array.insert(0, [1, 2, 3])
    
    const persistence = new DocumentPersistence(docId, doc, { userDatabase: userDb })
    await persistence.whenSynced
    await persistence.storeState()
    
    // Clear data - this will destroy persistence and delete stores
    await persistence.clearData()
    
    // Verify stores are gone - need to check after db reopens
    expect(userDb.hasDocumentStores(docId)).toBe(false)
    
    doc.destroy()
  }, 15000)
  
  it('should support multiple documents in same database', async () => {
    const doc1 = new Y.Doc()
    const doc2 = new Y.Doc()
    
    doc1.getArray('items').insert(0, ['doc1-item'])
    doc2.getArray('items').insert(0, ['doc2-item'])
    
    // Create documents sequentially to avoid version conflicts
    const persistence1 = new DocumentPersistence('multi-1', doc1, { userDatabase: userDb })
    await persistence1.whenSynced
    
    const persistence2 = new DocumentPersistence('multi-2', doc2, { userDatabase: userDb })
    await persistence2.whenSynced
    
    // Verify isolation
    expect(doc1.getArray('items').toArray()).toEqual(['doc1-item'])
    expect(doc2.getArray('items').toArray()).toEqual(['doc2-item'])
    
    persistence1.destroy()
    persistence2.destroy()
    doc1.destroy()
    doc2.destroy()
  }, 15000)
})

describe('UserDatabase', () => {
  it('should create and open database', async () => {
    const userId = 'test-user-' + Math.random().toString(36).slice(2) + '-' + Date.now()
    const userDb = new UserDatabase({ userId })
    
    await userDb.open()
    
    expect(userDb.isOpen).toBe(true)
    
    userDb.destroy()
  }, 10000)
  
  it('should create document stores', async () => {
    const userId = 'test-user-' + Math.random().toString(36).slice(2) + '-' + Date.now()
    const userDb = new UserDatabase({ userId })
    await userDb.open()
    
    const storeInfo = await userDb.getOrCreateDocumentStores('my-document')
    
    expect(storeInfo.documentId).toBe('my-document')
    expect(storeInfo.stores.updates).toContain('my-document')
    expect(storeInfo.stores.custom).toContain('my-document')
    
    userDb.destroy()
  }, 10000)
  
  it('should list documents', async () => {
    const userId = 'test-user-' + Math.random().toString(36).slice(2) + '-' + Date.now()
    const userDb = new UserDatabase({ userId })
    await userDb.open()
    
    await userDb.getOrCreateDocumentStores('doc-1')
    await userDb.getOrCreateDocumentStores('doc-2')
    await userDb.getOrCreateDocumentStores('doc-3')
    
    const documents = await userDb.listDocuments()
    
    expect(documents).toContain('doc-1')
    expect(documents).toContain('doc-2')
    expect(documents).toContain('doc-3')
    
    userDb.destroy()
  }, 15000)
  
  it('should delete document stores', async () => {
    const userId = 'test-user-' + Math.random().toString(36).slice(2) + '-' + Date.now()
    const userDb = new UserDatabase({ userId })
    await userDb.open()
    
    await userDb.getOrCreateDocumentStores('to-delete')
    expect(userDb.hasDocumentStores('to-delete')).toBe(true)
    
    await userDb.deleteDocumentStores('to-delete')
    expect(userDb.hasDocumentStores('to-delete')).toBe(false)
    
    userDb.destroy()
  }, 10000)
  
  it('should list user databases', async () => {
    const userId1 = 'list-test-1-' + Math.random().toString(36).slice(2) + '-' + Date.now()
    const userId2 = 'list-test-2-' + Math.random().toString(36).slice(2) + '-' + Date.now()
    
    const db1 = new UserDatabase({ userId: userId1 })
    const db2 = new UserDatabase({ userId: userId2 })
    
    await db1.open()
    await db2.open()
    
    const userDatabases = await UserDatabase.listUserDatabases()
    
    expect(userDatabases).toContain(userId1)
    expect(userDatabases).toContain(userId2)
    
    db1.destroy()
    db2.destroy()
  }, 10000)
})
