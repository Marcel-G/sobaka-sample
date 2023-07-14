// https://github.com/yjs/y-indexeddb/blob/master/src/y-indexeddb.js
import * as Y from "yjs"
import { Helia } from "@helia/interface"
import { ipns } from "@helia/ipns"
import { dagJson } from '@helia/dag-json'
import { sha256 } from 'multiformats/hashes/sha2'
import { dht, pubsub } from "@helia/ipns/routing"
import { CID } from 'multiformats/cid';
import { PeerId } from "@libp2p/interface-peer-id"
import { cloneDeep, debounce } from "lodash"
import { peerIdFromString } from "@libp2p/peer-id"

/**
 * IPFS persistence adapter for Yjs.
 */

/**
 * # Initialisation
 *
 * 1. Given some ipns name, try resolve the latest version of the workspace
 * 2. Load the metadata for the workspace
 * 
 * ```json
 * {
 *   "created": "2021-01-01T00:00:00.000Z",
 *   "updated": "2021-01-01T00:00:00.000Z",
 *   "name": "My Workspace",
 *   "creator": "0x1234567890123456789012345678901234567890",
 *   "updates": [
 *     "CID(1324567890123456789012345678901234567890)",
 *     "CID(1324567890123456789012345678901234567890)",
 *   ]
 * }
 * ```
 * 
 * 3. Load all the updates and apply them to the Yjs document
 * 
 * Any failures or timeouts should be handled gracefully.
 *
 * # Updates
 * 
 * 1. All YJS updates get added to IPFS
 * 2. The CID of the update is added to the workspace metadata
 * 3. If there are more than n updates, consolidate them into a single update
 * 4. Update the workspace metadata with updated timestamp and new update CIDs
 * 5. unpin the old workspace CIDs, pin the new workspace CIDs
 * 6. Publish the IPNS name for the workspace
 * 
 * # Destroy
 * 1.
 */

export interface SobakaMetadata {
  id: string
  created: string
  updated: string
  name: string
  creator: string
  updates: CID[]
}

// 1. Create keypair for new workspaces. I assume this gives public & private keys
// 2. Convert the keypair to a peer ID

const update_code = 0x0128 // @todo -- what to use here?

export const resolve_workspace = async (helia: Helia, id: string): Promise<SobakaMetadata> => {
  const j = dagJson(helia)
  const name = ipns(helia, [dht(helia), pubsub(helia)])


  const workspace_id = peerIdFromString(id)
  const metadata_id = await name.resolve(workspace_id, {
    onProgress: (event) => console.log(event)
  })
  return j.get<SobakaMetadata>(metadata_id)
}

export const create_workspace = async (helia: Helia): Promise<string> => {
  const j = dagJson(helia)
  const name = ipns(helia, [dht(helia)])

  const workspace_key = await helia.libp2p.keychain.createKey(crypto.randomUUID(), 'RSA')
  const workspace_id = await helia.libp2p.keychain.exportPeerId(workspace_key.name)

  const metadata: SobakaMetadata = {
    id: workspace_id.toString(),
    created: new Date().toUTCString(),
    updated: new Date().toUTCString(),
    name: "Untitled Workspace",
    creator: helia.libp2p.peerId.toString(),
    updates: []
  }

  const metadata_id = await j.add(metadata)

  await name.publish(workspace_id, metadata_id, {
    onProgress: (progress) => console.log(progress),
    // offline: true
  })

  return workspace_id.toString()
}

export const createSobakaDocAdapter = (helia: Helia, doc: Y.Doc, workspace_init: SobakaMetadata) => {
  const j = dagJson(helia)
  const name = ipns(helia, [dht(helia)])
  const metadata = cloneDeep(workspace_init)

  const load = async () => {
    for (const update of metadata.updates) {
      const buf = await helia.blockstore.get(update)
      Y.applyUpdate(doc, buf)
    }

    doc.on('update', update)
  }

  const create_consolidated_update = async () => {
    const buf = Y.encodeStateAsUpdate(doc)

    const hash = await sha256.digest(buf)
    const cid = CID.createV1(update_code, hash)

    await helia.blockstore.put(cid, buf)

    return cid
  }

  const publish = debounce(async () => {
    const metadata_id = await j.add(metadata)

    const key = await helia.libp2p.keychain.findKeyById(metadata.id)
    const workspace_id = await helia.libp2p.keychain.exportPeerId(key.name)

    await name.publish(workspace_id, metadata_id, {
      onProgress: (progress) => console.log('Publishing', progress),
      // offline: true
    })
  }, 200)

  const update = async (buf: Uint8Array) => {
    metadata.updated = new Date().toUTCString()

    if (metadata.updates.length > 100) {
      const cid = await create_consolidated_update()
      metadata.updates = [cid]
    } else {
      const hash = await sha256.digest(buf)
      const cid = CID.createV1(update_code, hash)

      await helia.blockstore.put(cid, buf)
      metadata.updates.push(cid)
    }

    publish()
  }

  const destroy = () => {
    doc.off('update', update)
    doc.off('destroy', destroy)
  }

  doc.on('destroy', destroy)

  return {
    load,
    destroy
  }
}