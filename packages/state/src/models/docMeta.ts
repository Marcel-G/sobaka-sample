import * as Y from 'yjs'

export class InvalidDocument extends Error {
  constructor(message: string) {
    super(`Invalid document: ${message}`)
  }
}

export class EmptyDocument extends Error {
  constructor(message: string) {
    super(`Empty document: ${message}`)
  }
}

export class DocMeta<K extends string> {
  constructor(
    private _kind: K,
    private doc: Y.Map<unknown>
  ) {
    if (!(doc instanceof Y.Map)) {
      throw new InvalidDocument(`expecting Y.Map`)
    }
  }

  get isEmpty() {
    const meta = this.doc
    return (
      !meta.has('kind') ||
      !meta.has('createdAt') ||
      !meta.has('updatedAt') ||
      !meta.has('collaborators')
    )
  }

  validate() {
    if (this.isEmpty) {
      throw new EmptyDocument(`Doc is not populated`)
    }

    /* eslint-disable @typescript-eslint/no-unused-expressions */
    this.kind
    this.createdAt
    this.updatedAt
    this.collaborators
    /* eslint-enable @typescript-eslint/no-unused-expressions */
  }

  get kind(): K {
    if (this._kind !== this.doc.get('kind')) {
      throw new InvalidDocument(
        `'kind' ${this.doc.get('kind')} but expected ${this._kind}`
      )
    }
    return this._kind
  }

  get createdAt(): Date {
    try {
      const v = this.doc.get('createdAt')
      if (typeof v !== 'number') throw new Error('expecting number')
      return new Date(v)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error: unknown) {
      throw new InvalidDocument(`'createdAt' is not a valid date`)
    }
  }

  get updatedAt(): Date {
    try {
      const v = this.doc.get('updatedAt')
      if (typeof v !== 'number') throw new Error('expecting number')
      return new Date(v)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error: unknown) {
      throw new InvalidDocument(`'updatedAt' is not a valid date`)
    }
  }

  get collaborators(): Y.Array<string> {
    const collaborators = this.doc.get('collaborators')

    if (
      !(collaborators instanceof Y.Array) ||
      collaborators.toArray().some(v => typeof v !== 'string')
    ) {
      throw new InvalidDocument(`'collaborators' is not a valid array of strings`)
    }

    return collaborators
  }

  get name(): string | undefined {
    const name = this.doc.get('name')
    if (name === undefined) return undefined
    if (typeof name !== 'string') return undefined
    return name
  }

  set name(value: string | undefined) {
    if (value === undefined) {
      this.doc.delete('name')
    } else {
      this.doc.set('name', value)
    }
  }

  synced(fn: () => void) {
    const handler = () => {
      if (this.isEmpty) return
      this.doc.unobserve(handler)
      fn()
    }
    this.doc.observe(handler)
    handler()
  }

  populate() {
    const meta = this.doc
    meta.set('kind', this._kind)
    meta.set('createdAt', Number(new Date()))
    meta.set('updatedAt', Number(new Date()))
    meta.set('collaborators', Y.Array.from([]))
  }

  handleUpdate() {
    this.doc.set('updatedAt', Number(new Date()))
  }

  addCollaborator(identity: string) {
    const collaborators = this.collaborators
    if (collaborators.toArray().includes(identity)) return
    collaborators.push([identity])
  }

  takeOwnership(identity: string) {
    this.doc.set('collaborators', Y.Array.from([]))
    this.addCollaborator(identity)
  }

  removeCollaborator(identity: string) {
    const collaborators = this.collaborators
    const index = collaborators.toArray().indexOf(identity)
    if (index === -1) return
    collaborators.delete(index)
  }

  isCollaborator(identity: string) {
    return this.collaborators.toArray().includes(identity)
  }
}
