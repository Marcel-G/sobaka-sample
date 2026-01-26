import * as Y from 'yjs'
import { describe, it, expect } from 'vitest'
import { DocMeta } from './docMeta.ts'

const kind = 'test-doc'

describe('DocMeta', () => {
  it('should report empty document', () => {
    const doc = new Y.Doc()
    const _meta = doc.getMap('meta')
    const meta = new DocMeta(kind, _meta)

    expect(meta.isEmpty).toBe(true)
  })

  it('should not add duplicate collaborator to meta', () => {
    const doc = new Y.Doc()

    const _meta = doc.getMap('meta')
    const meta = new DocMeta(kind, _meta)

    meta.populate()

    expect(meta.isEmpty).toBe(false)
  })

  it('should throw `InvalidDocument` when kind does not match', () => {
    const doc = new Y.Doc()

    const _meta = doc.getMap('meta')
    const meta = new DocMeta(kind, _meta)

    _meta.set('kind', 'invalid')

    _meta.set('createdAt', Number(new Date()))
    _meta.set('updatedAt', Number(new Date()))
    _meta.set('collaborators', Y.Array.from([]))

    expect(() => meta.kind).toThrow("Invalid document: 'kind' invalid but expected test-doc")
  })

  it('should throw `InvalidDocument` if date is invalid', () => {
    const doc = new Y.Doc()

    const _meta = doc.getMap('meta')
    const meta = new DocMeta(kind, _meta)

    _meta.set('createdAt', 'invalid')
    _meta.set('updatedAt', 'invalid')

    _meta.set('kind', kind)
    _meta.set('collaborators', Y.Array.from([]))

    expect(() => meta.createdAt).toThrow("Invalid document: 'createdAt' is not a valid date")
    expect(() => meta.updatedAt).toThrow("Invalid document: 'updatedAt' is not a valid date")
  })

  it('should throw `InvalidDocument` if collaborators is invalid', () => {
    const doc = new Y.Doc()

    const _meta = doc.getMap('meta')
    const meta = new DocMeta(kind, _meta)

    _meta.set('collaborators', Y.Array.from([1, 2, 3]))

    _meta.set('kind', kind)
    _meta.set('createdAt', Number(new Date()))
    _meta.set('updatedAt', Number(new Date()))

    expect(() => meta.collaborators).toThrow("Invalid document: 'collaborators' is not a valid array of strings")
  })

  it('should return `DocMeta` when document is valid', () => {
    const doc = new Y.Doc()

    const _meta = doc.getMap('meta')
    const meta = new DocMeta(kind, _meta)

    const now = new Date()
    _meta.set('kind', kind)
    _meta.set('createdAt', Number(now))
    _meta.set('updatedAt', Number(now))
    _meta.set('collaborators', Y.Array.from(['user1', 'user2']))

    expect(meta.kind).toBe(kind)
    expect(meta.createdAt).toEqual(now)
    expect(meta.updatedAt).toEqual(now)
    expect(meta.collaborators.toArray()).toEqual(['user1', 'user2'])
  })

  it('should fill in empty meta when populate is called', () => {
    const doc = new Y.Doc()
    const _meta = doc.getMap('meta')
    const meta = new DocMeta(kind, _meta)

    meta.populate()

    expect(meta.kind).toBe(kind)
    expect(meta.collaborators.toArray()).toEqual([])
  })

  it('should add collaborator to meta', () => {
    const doc = new Y.Doc()

    const _meta = doc.getMap('meta')
    const meta = new DocMeta(kind, _meta)

    meta.populate()

    meta.addCollaborator('user1')

    expect(meta.collaborators.toArray()).toEqual(['user1'])
  })

  it('should not add duplicate collaborator to meta', () => {
    const doc = new Y.Doc()

    const _meta = doc.getMap('meta')
    const meta = new DocMeta(kind, _meta)

    meta.populate()

    meta.addCollaborator('user1')
    meta.addCollaborator('user1')

    expect(meta.collaborators.toArray()).toEqual(['user1'])
  })

  it('should remove collaborator from meta', () => {
    const doc = new Y.Doc()

    const _meta = doc.getMap('meta')
    const meta = new DocMeta(kind, _meta)

    meta.populate()

    meta.addCollaborator('user1')

    expect(meta.collaborators.toArray()).toEqual(['user1'])

    meta.removeCollaborator('user1')

    expect(meta.collaborators.toArray()).toEqual([])
  })

  it('should report if someone is a collaborator', () => {
    const doc = new Y.Doc()

    const _meta = doc.getMap('meta')
    const meta = new DocMeta(kind, _meta)

    meta.populate()

    meta.addCollaborator('user1')

    expect(meta.isCollaborator('user1')).toBe(true)
  })
})
