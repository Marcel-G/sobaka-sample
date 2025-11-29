import * as Y from 'yjs'

import { describe, it } from 'node:test'
import { DocMeta } from './docMeta'
import assert from 'node:assert'

const kind = 'test-doc'

describe('DocMeta', () => {
  it('should report empty document', () => {
    const doc = new Y.Doc()
    const _meta = doc.getMap('meta')
    const meta = new DocMeta(kind, _meta)

    assert.equal(meta.isEmpty, true)
  })

  it('should not add duplicate collaborator to meta', () => {
    const doc = new Y.Doc()

    const _meta = doc.getMap('meta')
    const meta = new DocMeta(kind, _meta)

    meta.populate()

    assert.equal(meta.isEmpty, false)
  })

  it('should throw `InvalidDocument` when kind does not match', () => {
    const doc = new Y.Doc()

    const _meta = doc.getMap('meta')
    const meta = new DocMeta(kind, _meta)

    _meta.set('kind', 'invalid')

    _meta.set('createdAt', Number(new Date()))
    _meta.set('updatedAt', Number(new Date()))
    _meta.set('collaborators', Y.Array.from([]))

    assert.throws(() => meta.kind, {
      message: "Invalid document: 'kind' invalid but expected test-doc"
    })
  })

  it('should throw `InvalidDocument` if date is invalid', () => {
    const doc = new Y.Doc()

    const _meta = doc.getMap('meta')
    const meta = new DocMeta(kind, _meta)

    _meta.set('createdAt', 'invalid')
    _meta.set('updatedAt', 'invalid')

    _meta.set('kind', kind)
    _meta.set('collaborators', Y.Array.from([]))

    assert.throws(() => meta.createdAt, {
      message: "Invalid document: 'createdAt' is not a valid date"
    })

    assert.throws(() => meta.updatedAt, {
      message: "Invalid document: 'updatedAt' is not a valid date"
    })
  })

  it('should throw `InvalidDocument` if collaborators is invalid', () => {
    const doc = new Y.Doc()

    const _meta = doc.getMap('meta')
    const meta = new DocMeta(kind, _meta)

    _meta.set('collaborators', Y.Array.from([1, 2, 3]))

    _meta.set('kind', kind)
    _meta.set('createdAt', Number(new Date()))
    _meta.set('updatedAt', Number(new Date()))

    assert.throws(() => meta.collaborators, {
      message: "Invalid document: 'collaborators' is not a valid array of strings"
    })
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

    assert.equal(meta.kind, kind)
    assert.deepEqual(meta.createdAt, now)
    assert.deepEqual(meta.updatedAt, now)
    assert.deepEqual(meta.collaborators.toArray(), ['user1', 'user2'])
  })

  it('should fill in empty meta when populate is called', () => {
    const doc = new Y.Doc()
    const _meta = doc.getMap('meta')
    const meta = new DocMeta(kind, _meta)

    meta.populate()

    assert.equal(meta.kind, kind)
    assert.deepEqual(meta.collaborators.toArray(), [])
  })

  it('should add collaborator to meta', () => {
    const doc = new Y.Doc()

    const _meta = doc.getMap('meta')
    const meta = new DocMeta(kind, _meta)

    meta.populate()

    meta.addCollaborator('user1')

    assert.deepEqual(meta.collaborators.toArray(), ['user1'])
  })

  it('should not add duplicate collaborator to meta', () => {
    const doc = new Y.Doc()

    const _meta = doc.getMap('meta')
    const meta = new DocMeta(kind, _meta)

    meta.populate()

    meta.addCollaborator('user1')
    meta.addCollaborator('user1')

    assert.deepEqual(meta.collaborators.toArray(), ['user1'])
  })

  it('should remove collaborator from meta', () => {
    const doc = new Y.Doc()

    const _meta = doc.getMap('meta')
    const meta = new DocMeta(kind, _meta)

    meta.populate()

    meta.addCollaborator('user1')

    assert.deepEqual(meta.collaborators.toArray(), ['user1'])

    meta.removeCollaborator('user1')

    assert.deepEqual(meta.collaborators.toArray(), [])
  })

  it('should report if someone is a collaborator', () => {
    const doc = new Y.Doc()

    const _meta = doc.getMap('meta')
    const meta = new DocMeta(kind, _meta)

    meta.populate()

    meta.addCollaborator('user1')

    assert.equal(meta.isCollaborator('user1'), true)
  })
})
