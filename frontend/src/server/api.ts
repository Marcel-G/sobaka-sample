/*
  Client api for communicating with Dumb backend server
*/

import type { Operation } from 'fast-json-patch'
import { WorkspaceDocument } from '../worker/persistence'
import _ from 'lodash'

export const save = async (document: WorkspaceDocument) => {
  await fetch(`/workspace/template/${document.id}/edit`, {
    method: 'POST',
    headers: {
      accept: 'application/json'
    },
    body: JSON.stringify(document)
  })

  return document.id
}

export const destroy = async (id: string) => {
  await fetch(`/workspace/template/${id}/edit`, {
    method: 'DELETE',
    headers: {
      accept: 'application/json'
    },
    body: JSON.stringify({ id })
  })

  // @todo error / response
}

let change_queue: Operation[] = []

const apply_patches = _.debounce(async (id: string) => {
  await fetch(`/workspace/template/${id}/edit`, {
    method: 'PATCH',
    headers: {
      accept: 'application/json'
    },
    body: JSON.stringify({ id, changes: change_queue })
  })

  change_queue = []
}, 1000)

export const patch = async (id: string, changes: Operation[]) => {
  change_queue.push(...changes)

  void apply_patches(id)
}

export const load = async (id: string): Promise<WorkspaceDocument | null> => {
  // Use dynamic import since no server actually exists

  const response = await fetch(`/templates/${id}.json`)

  const document = await response.json()

  // @todo type check doument

  return document
}
