import { Readable, Writable } from '@crikey/stores-base'
import { Selectable } from '@crikey/stores-selectable'
import jsonPatch from 'fast-json-patch'
import type { Operation } from 'fast-json-patch'
import { Patch } from 'immer'
import _ from 'lodash'

export const subscribe_patches = <T extends object, S extends Readable<T>>(
  store: S,
  cb: (change: Operation[]) => void,
  without: Array<keyof T>
) => {
  let previousState: Omit<T, keyof T> | null = null
  return store.subscribe(new_state => {
    const reduced_state = _.omit({ ...new_state }, without)
    if (previousState !== null) {
      cb(jsonPatch.compare(previousState, reduced_state))
    }
    previousState = reduced_state
  })
}

export type SubStore<T> = Selectable<T, Writable<T>, PropertyKey>

export const json_patches_to_immer_patches = (jsonPatches: Operation[]): Patch[] => {
  return jsonPatches.map(x => ({
    ...x,
    path: json_path_to_array(x.path)
  })) as Patch[]
}

const json_path_to_array = (path: string): string[] => {
  // The JSON Patch definition defines the path as a RFC6901 JSON Path [1].
  // The JSON Path definition contains some escaping rules that we have to
  // follow [2].
  // [1]: https://datatracker.ietf.org/doc/html/rfc6902#section-4
  // [2]: https://datatracker.ietf.org/doc/html/rfc6901#section-3

  // remove the leading slash, split at the others
  const parts = path.replace(/^\//, '').split('/')

  // replace escaped characters (~1 and ~0)
  const unescaped = parts.map(x => x.replaceAll('~1', '/').replaceAll('~0', '~'))
  return unescaped
}
