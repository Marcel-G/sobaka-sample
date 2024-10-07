import { svelteSyncedStore } from '@syncedstore/svelte'
import { Readable } from 'svelte/store'

/**
 * Creates Svelte store from a SyncedStore compatible object.
 */
export function intoReadable<T>(syncedObject: T): Readable<T> {
  return svelteSyncedStore(syncedObject)
}
