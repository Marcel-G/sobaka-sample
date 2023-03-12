import { WorkspaceMeta } from 'src/workspace/state'
import { IndexeddbPersistence } from 'y-indexeddb'
import * as Y from 'yjs'
import { get_repo } from './ipfs'

const STATE_PATH = '/state'

/**
 * Checks that the string is a valid CID and that
 * the IPFS object that it points to exists.
 */
export const validate_cid = async (cid: string): Promise<boolean> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _buf of get_repo().get(cid)) {
      return true
    }
  } catch (error) {
    console.error(error) // @todo
  }

  return false
}

const cat_to_doc = async (cid: string, doc: Y.Doc): Promise<void> => {
  const chunks: Uint8Array[] = []
  for await (const chunk of get_repo().cat(cid)) {
    chunks.push(chunk)
  }
  const snapshot_data = Uint8Array.from(chunks.flatMap(chunk => Array.from(chunk)))

  Y.applyUpdate(doc, snapshot_data)
}

/**
 * Downloads a remote state from IPFS and loads it into state
 */
export const load_from_remote = async (cid: string, doc: Y.Doc): Promise<void> => {
  await cat_to_doc(cid, doc)

  await get_repo().pin.add(cid)
}

/**
 * Captures the current state and uploads it to IPFS
 */
export const save_to_remote = async (doc: Y.Doc): Promise<string> => {
  // @todo - I could probably store just increments & somehow link the IPFS blocks together
  const snapshot_data = Y.encodeStateAsUpdate(doc)

  const file = await get_repo().add(snapshot_data, {
    pin: true
  })

  await get_repo().files.cp(file.cid, STATE_PATH, { parents: true })

  return file.cid.toString()
}

export const list_remote = async (): Promise<WorkspaceMetaId[]> => {
  const entries: WorkspaceMetaId[] = []
  try {
    for await (const entry of get_repo().files.ls(STATE_PATH)) {
      const stat = await get_repo().files.stat(entry.cid)

      if (stat.type === 'file') {
        const id = entry.cid.toString()
        const doc = new Y.Doc()
        await cat_to_doc(entry.cid.toString(), doc)
        const result = doc.getMap('meta').toJSON() as WorkspaceMeta
        doc.destroy()
        entries.push({
          ...result,
          id,
          type: 'remote'
        })
      }
    }

    return entries
  } catch (error) {
    return []
  }
}

export type WorkspaceMetaId = WorkspaceMeta & { id: string; type: 'remote' | 'local' }

export const create_db_name = (id: string) => `sobaka-draft-${id}`

export const list_local = async (): Promise<WorkspaceMetaId[]> => {
  return []
  // @todo -- `indexedDB.databases()` is draft spec % doesn't work in FF
  const databases = await indexedDB.databases()

  return await Promise.all(
    databases
      .filter(db => db.name?.match('sobaka-draft-'))
      .map(async db => {
        const id = db.name!.replace('sobaka-draft-', '')
        const doc = new Y.Doc()
        const provider = new IndexeddbPersistence(db.name!, doc)
        await provider.whenSynced
        const result = doc.getMap('meta').toJSON() as WorkspaceMeta
        doc.destroy()
        return { ...result, id, type: 'local' }
      })
  )
}

export const remove_local = async (id: string) => {
  await indexedDB.deleteDatabase(create_db_name(id))
}

export const remove_remote = async (cid: string) => {
  await get_repo().pin.rm(cid)
}
