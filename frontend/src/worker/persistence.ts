import localforage from 'localforage'
import * as immer from 'immer'
import { json_patches_to_immer_patches } from '../utils/patches'
import { Link, Module } from '../workspace/state'
import { differenceInHours } from 'date-fns'
import type { Operation } from 'fast-json-patch'
import _ from 'lodash'
import { Entity } from '../@types/entity'

immer.enablePatches()
export interface WorkspaceDocument {
  version: '0.1.0'
  id: string
  title: string
  modules: Entity<Module>
  links: Entity<Required<Link>>
  createdAt: Date
  modifiedAt: Date
}

const workspace_store = localforage.createInstance({
  name: 'workspace_store',
  driver: localforage.INDEXEDDB
})

export const create = (clone?: WorkspaceDocument): WorkspaceDocument => {
  const id = Math.random().toString(36).substr(2, 9)
  let workspace: WorkspaceDocument

  if (clone) {
    workspace = {
      ...clone,
      title: clone.title + ' (Clone)',
      id,
      createdAt: new Date(),
      modifiedAt: new Date()
    }
  } else {
    workspace = {
      version: '0.1.0',
      id,
      title: 'New Workspace',
      modules: {
        ids: [],
        entities: {}
      },
      links: {
        ids: [],
        entities: {}
      },
      createdAt: new Date(),
      modifiedAt: new Date()
    }
  }
  return workspace
}

export const load_workspace = async (id: string): Promise<WorkspaceDocument | null> => {
  return workspace_store.getItem(id)
}

export const save_workspace = async (workspace: WorkspaceDocument) => {
  await workspace_store.setItem(workspace.id, workspace)

  return workspace.id
}

export const delete_workspace = async (id: string) => {
  await workspace_store.removeItem(id)
}

export const clean_db = async () => {
  const stale: string[] = []

  await workspace_store.iterate((workspace: WorkspaceDocument, id) => {
    // Delete workspaces old versions
    if (workspace?.version !== '0.1.0') {
      stale.push(id)
    }
    // Delete empty workspaces
    else if (
      differenceInHours(workspace.modifiedAt, new Date()) > 3 &&
      workspace.modules.ids.length === 0
    ) {
      stale.push(id)
    }
  })

  await Promise.all(stale.map(id => workspace_store.removeItem(id)))

  return stale
}

export const list_workspaces = async () => {
  const workspaces: Pick<
    WorkspaceDocument,
    'id' | 'title' | 'modifiedAt' | 'createdAt'
  >[] = []

  await workspace_store.iterate((workspace: WorkspaceDocument) => {
    if (workspace) {
      workspaces.push(_.pick(workspace, 'id', 'title', 'createdAt', 'modifiedAt'))
    }
  })

  return workspaces
}

let change_queue: Operation[] = []

export const patch_workspace = (id: string, change: Operation[]) => {
  change_queue.push(...change)

  void apply_patches(id)
}

const apply_patches = _.debounce(async (id: string) => {
  const workspace = await load_workspace(id)

  if (workspace) {
    let next = immer.applyPatches(workspace, json_patches_to_immer_patches(change_queue))

    next = immer.produce(next, draft => {
      draft.modifiedAt = new Date()
    })

    console.log(`Applying ${change_queue.length} patches to ${id}`)
    change_queue = []
    await save_workspace(next)
  }
}, 1000)
