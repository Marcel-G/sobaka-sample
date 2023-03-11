import { create, IPFS } from 'ipfs-core'
import { WorkspaceMeta } from 'src/workspace/state'
import { IndexeddbPersistence } from 'y-indexeddb'
import * as Y from 'yjs'

/**
 * Persistence layer for workspace states
 *
 * Workspace states are stored on IPFS which enables
 * - Offline / local persistent via indexeddb
 * - Sharable states so long as clients are online (non collaborative)
 * - Persistent sharable states via third party ipfs pinning service
 */

let ipfs: IPFS

const init = async () => {
  if (!ipfs) {
    ipfs = await create({
      repo: 'sobaka-state',
      init: { algorithm: 'Ed25519' }
    })
  }
}

/**
 * Checks that the string is a valid CID and that
 * the IPFS object that it points to exists.
 */
export const validate_cid = async (cid: string): Promise<boolean> => {
  await init()

  try {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _buf of ipfs.get(cid)) {
      return true
    }
  } catch (error) {
    console.error(error) // @todo
  }

  return false
}

const cat_to_doc = async (cid: string, doc: Y.Doc): Promise<void> => {
  const chunks: Uint8Array[] = []
  for await (const chunk of ipfs.cat(cid)) {
    chunks.push(chunk)
  }
  const snapshot_data = Uint8Array.from(chunks.flatMap(chunk => Array.from(chunk)))

  Y.applyUpdate(doc, snapshot_data)
}

/**
 * Downloads a remote state from IPFS and loads it into state
 */
export const load_from_remote = async (cid: string, doc: Y.Doc): Promise<void> => {
  await init()

  await ipfs.pin.add(cid)

  await cat_to_doc(cid, doc)
}

/**
 * Captures the current state and uploads it to IPFS
 */
export const save_to_remote = async (doc: Y.Doc): Promise<string> => {
  await init()

  // @todo - I could probably store just increments & somehow link the IPFS blocks together
  const snapshot_data = Y.encodeStateAsUpdate(doc)

  const file = await ipfs.add(
    {
      path: '/',
      content: snapshot_data
    },
    {
      pin: true
    }
  )

  return file.cid.toString()
}

export const list_remote = async (): Promise<WorkspaceMetaId[]> => {
  await init()

  const entries: WorkspaceMetaId[] = []
  for await (const entry of ipfs.pin.ls()) {
    const stat = await ipfs.files.stat(entry.cid)

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
}

export type WorkspaceMetaId = WorkspaceMeta & { id: string; type: 'remote' | 'local' }

export const create_db_name = (id: string) => `sobaka-draft-${id}`

export const list_local = async (): Promise<WorkspaceMetaId[]> => {
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
  const result = await indexedDB.deleteDatabase(create_db_name(id))
}

export const remove_remote = async (cid: string) => {
  await init()

  await ipfs.pin.rm(cid)
}
