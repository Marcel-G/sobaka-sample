import * as Y from 'yjs'
import { getYjsValue } from '@syncedstore/core'

const brand = Symbol('SubDoc')

/**
 * Opauqe type representing the underlying storage for a subdoc.
 */
export type SubDocReference = { __brand: typeof brand }

/**
 * SyncedStore compatible subdocument.
 *
 * SyncedStore does not support subdocs. [see issue](https://github.com/YousefED/SyncedStore/issues/98)
 * Therefore subdocs need to be created and referenced from the undelying yjs document.
 *
 * In order to do this, the Y.Doc must be wrapped in a Y.Map so that it can be accessed with the `getYjsValue` API.
 * Accessing the Y.Doc must be done via `.inner` and not directly from the SyncedStore to avoid
 * the document being boxed and consiquently having Object.freeze() called on it.
 * [see issue](https://github.com/YousefED/SyncedStore/issues/118#issuecomment-1780872544)
 */
export class SubDoc {
  constructor(public inner: Y.Doc) {}

  static create(doc: Y.Doc = new Y.Doc()) {
    return new SubDoc(doc)
  }

  static fromRef(store: SubDocReference) {
    const wrapper = getYjsValue(store)
    if (!(wrapper instanceof Y.Map)) {
      throw new Error('Subdoc wrapper must be a Y.Map')
    }

    const doc = wrapper.get('content')

    if (!doc) {
      throw new Error('Invalid SubDoc reference')
    }

    return new SubDoc(doc)
  }

  intoRef(): SubDocReference {
    return new Y.Map(
      Object.entries({ content: this.inner })
    ) as unknown as SubDocReference
  }
}
