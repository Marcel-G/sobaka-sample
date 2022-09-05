/*
  Dumb backend server for creating examples.
  Stores files locally which can be committed to the repo as examples
*/

import type { Operation } from 'fast-json-patch'
import { promises as fs } from 'fs'
import path from 'path'
import * as immer from 'immer'
import { json_patches_to_immer_patches } from '../utils/patches'
import { WorkspaceDocument } from '../worker/persistence'

const DIR = './static/templates'

const file_path = (id: string): string => `${DIR}/${id}.json`

export const load = async (id: string): Promise<WorkspaceDocument | null> => {
  const file = await fs.readFile(file_path(id), { encoding: 'utf-8' })

  const document = JSON.parse(file)

  return document
}

const is_workspace = (
  document: WorkspaceDocument | null
): document is WorkspaceDocument => document !== null

export const list = async (): Promise<WorkspaceDocument[]> => {
  const dir = await fs.readdir(DIR)

  const files = await Promise.all(
    dir
      .filter(file => path.extname(file) === '.json')
      .map(async file => {
        const [id] = file.split('.')
        return await load(id)
      })
  )

  return files.filter(is_workspace)
}

export const save = async (id: string, doc: WorkspaceDocument): Promise<void> => {
  const file = JSON.stringify(doc, null, 2)

  await fs.writeFile(file_path(id), file)
}

export const patch = async (id: string, changes: Operation[]) => {
  const patches = json_patches_to_immer_patches(changes)

  const document = await load(id)

  if (!document) {
    throw new Error("Can't find workspace")
  }

  const next = immer.applyPatches(document, patches)

  await save(id, next)
}

export const destroy = async (id: string) => {
  await fs.rm(file_path(id))
}
