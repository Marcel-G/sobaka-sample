import localforage from 'localforage'
import * as immer from 'immer'
import { json_patches_to_immer_patches } from '../utils/patches'
import { Link, Module } from '../workspace/state'
import { differenceInHours } from 'date-fns'
import { Operation } from 'fast-json-patch'
import { debounce, pick } from 'lodash'
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

export const new_workspace = async () => {
  const id = Math.random().toString(36).substr(2, 9)

  const workspace: WorkspaceDocument = {
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

  await save_workspace(id, workspace)

  return id
}

export const load_workspace = async (id: string): Promise<WorkspaceDocument | null> => {
  return workspace_store.getItem(id)
}

export const save_workspace = async (id: string, workspace: WorkspaceDocument) => {
  await workspace_store.setItem(id, workspace)
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
      workspaces.push(pick(workspace, 'id', 'title', 'createdAt', 'modifiedAt'))
    }
  })

  return workspaces
}

let change_queue: immer.Patch[] = []

export const patch_workspace = (id: string, change: Operation[]) => {
  const patches = json_patches_to_immer_patches(change)

  change_queue.push(...patches)

  void apply_patches(id)
}

const apply_patches = debounce(async (id: string) => {
  const workspace = await load_workspace(id)

  if (workspace) {
    let next = immer.applyPatches(workspace, change_queue)

    next = immer.produce(next, draft => {
      draft.modifiedAt = new Date()
    })

    console.log(`Applying ${change_queue.length} patches to ${id}`)
    change_queue = []
    await save_workspace(id, next)
  }
}, 1000)
