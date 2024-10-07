import { IndexeddbPersistence } from 'y-indexeddb'
import * as Y from 'yjs'

/**
 * Indexeddb provider with subdocument support
 *
 * `y-indexeddb` does not support [subdocuments](https://docs.yjs.dev/api/subdocuments).
 *  [see issue](https://github.com/yjs/yjs/issues/526)
 *  [see issue](https://github.com/yjs/yjs/issues/526#issue-1677346412)
 *
 * When loaded, subdocuments will have the persistance provider added.
 * Each subdocument gets it's own indexeddb database
 */
export class SubdocIndexeddbPersistence {
  private subdocProviders: WeakMap<Y.Doc, IndexeddbPersistence> = new WeakMap()

  constructor(doc: Y.Doc) {
    this.registerProvider(doc)
  }

  private registerProvider(doc: Y.Doc) {
    const provider = new IndexeddbPersistence(doc.guid, doc)
    provider.on('synced', () => {
      // Propogating synced event to subdoc
      doc.emit('synced', [this])
    })
    this.subdocProviders.set(doc, provider)

    doc.on(
      'subdocs',
      ({ loaded }: { added: Set<Y.Doc>; removed: Set<Y.Doc>; loaded: Set<Y.Doc> }) => {
        loaded.forEach((subdoc: Y.Doc) => {
          this.registerProvider(subdoc)
        })
      }
    )
  }

  getProvider(doc: Y.Doc) {
    return this.subdocProviders.get(doc)
  }
}
