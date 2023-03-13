import { WorkspaceMeta } from 'src/workspace/state'
import { clearDocument, IndexeddbPersistence } from 'y-indexeddb'
import * as Y from 'yjs'
import { get_repo } from './ipfs'

const SHARED_STATE_PATH = '/state/shared/'
const DRAFT_STATE_PATH = '/state/draft/'

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
export const load_from_remote = async (id: string, doc: Y.Doc): Promise<void> => {
  await cat_to_doc(id, doc)

  const cid = await get_repo().pin.add(id)

  await get_repo()
    .files.cp(cid, SHARED_STATE_PATH + cid.toString(), { parents: true })
    .catch(() => {
      // Ignore if it's already in the dir
    })
}

/**
 * Captures the current state and uploads it to IPFS
 */
export const save_to_remote = async (doc: Y.Doc): Promise<string> => {
  // @todo - I could probably store just increments & somehow link the IPFS blocks together
  const snapshot_data = Y.encodeStateAsUpdate(doc)

  const { cid } = await get_repo().add(snapshot_data, {
    pin: true
  })

  await get_repo()
    .files.cp(cid, SHARED_STATE_PATH + cid.toString(), { parents: true })
    .catch(() => {
      // Ignore if it's already in the dir
    })

  return cid.toString()
}

export const list_remote = async (): Promise<WorkspaceMetaId[]> => {
  const entries: WorkspaceMetaId[] = []
  try {
    for await (const { cid } of get_repo().files.ls(SHARED_STATE_PATH)) {
      const stat = await get_repo().files.stat(cid)

      if (stat.type === 'file') {
        const doc = new Y.Doc()
        await cat_to_doc(cid.toString(), doc)
        const result = doc.getMap('meta').toJSON() as WorkspaceMeta
        doc.destroy()
        entries.push({
          ...result,
          cid: cid.toString(),
          type: 'remote'
        })
      }
    }

    return entries
  } catch (error) {
    return []
  }
}

export type WorkspaceMetaId = WorkspaceMeta & { cid: string; type: 'remote' | 'local' }

export const create_db_name = (id: string) => `sobaka-draft-${id}`

export const save_draft = async (_doc?: Y.Doc): Promise<string> => {
  const doc = _doc || new Y.Doc()
  const id = create_db_name(doc.guid)

  const provider = new IndexeddbPersistence(id, doc)
  await provider.whenSynced

  // provider.destroy()

  // A draft is simply a pointer to some local DB
  const draft = { id }

  const { cid } = await get_repo().add(JSON.stringify(draft), {
    pin: true
  })

  get_repo().name.publish

  await get_repo()
    .files.cp(cid, DRAFT_STATE_PATH + cid.toString(), { parents: true })
    .catch(() => {
      // Ignore if it's already in the dir
    })

  return cid.toString()
}

const cat_to_draft = async (cid: string): Promise<{ id: string }> => {
  const chunks: Uint8Array[] = []
  for await (const chunk of get_repo().cat(cid)) {
    chunks.push(chunk)
  }
  const data = Uint8Array.from(chunks.flatMap(chunk => Array.from(chunk)))

  return JSON.parse(new TextDecoder().decode(data).toString()) as { id: string }
}

export const resolve_draft_id = async (cid: string): Promise<string | null> => {
  try {
    const { id } = await cat_to_draft(cid)

    return id
  } catch {
    return null
  }
}

export const list_local = async (): Promise<WorkspaceMetaId[]> => {
  const entries: WorkspaceMetaId[] = []
  try {
    for await (const { cid } of get_repo().files.ls(DRAFT_STATE_PATH)) {
      const stat = await get_repo().files.stat(cid)

      if (stat.type === 'file') {
        const file = await cat_to_draft(cid.toString())

        const doc = new Y.Doc()
        const provider = new IndexeddbPersistence(file.id, doc)
        await provider.whenSynced
        const result = doc.getMap('meta').toJSON() as WorkspaceMeta

        doc.destroy()

        // @todo -- result can be `{}` if the data is no longer in indexeddb
        if ('title' in result) {
          entries.push({ ...result, cid: cid.toString(), type: 'local' })
        } else {
          console.error('orphaned draft reference')
        }
      }
    }

    return entries
  } catch (error) {
    return []
  }
}

export const remove_local = async (cid: string) => {
  try {
    const { id } = await cat_to_draft(cid)
    clearDocument(id)
  } finally {
    await get_repo().pin.rm(cid)
    await get_repo().files.rm(DRAFT_STATE_PATH + cid)
  }
}

export const remove_remote = async (cid: string) => {
  await get_repo().pin.rm(cid)
  await get_repo().files.rm(SHARED_STATE_PATH + cid)
}
