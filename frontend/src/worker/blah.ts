import all from 'it-all';
import * as Y from 'yjs'
import filter from 'it-filter'
import toBuffer from 'it-to-buffer'
import { pipe } from 'it-pipe'
import map from 'it-map'
import { type CID } from 'multiformats/cid';
import { UnixFS } from "@helia/unixfs";
import { WorkspaceMeta } from '../workspace/state';
import { type UnixFSEntry } from 'ipfs-unixfs-exporter';

export type WorkspaceMetaId = WorkspaceMeta & { cid: string; type: 'remote' | 'local' }

const create = async (fs: UnixFS, dir: string) => {
  const dir_cid = await fs.addDirectory({
    path: dir,
  })

  return ({
    add: async (doc: Y.Doc): Promise<CID> => {
      const snapshot_data = Y.encodeStateAsUpdate(doc)

      const cid = await fs.addFile({
        content: snapshot_data
      });

      await fs.cp(cid, dir_cid, cid.toString())

      return cid
    },
    list: async (): Promise<WorkspaceMetaId[]> => {
      const file_meta = await pipe(
        fs.ls(dir_cid),
        source => filter(source, (entry) => entry.type === 'file'),
        source => map(source,  entry_to_meta),
      )

      return all(file_meta)
    }
  })
}

const entry_to_meta = async (entry: UnixFSEntry): Promise<WorkspaceMetaId> => {
  const doc = new Y.Doc()
  const content = await toBuffer(entry.content())

  Y.applyUpdate(doc, content)

  const result = doc.getMap('meta').toJSON() as WorkspaceMeta

  doc.destroy()

  return {
    ...result,
    cid: entry.cid.toString(),
    type: 'remote'
  }
}