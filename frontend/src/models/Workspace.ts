import type { CID } from 'multiformats/cid'
import type { KeyInfo } from '@libp2p/interface/keychain'
import type { PeerId } from "@libp2p/interface-peer-id"
import type { SobakaStorage } from '../worker/storage'

import * as Y from 'yjs'
import { debounce, type DebouncedFunc } from 'lodash'
import { SobakaWorkspaceStore, WorkspaceDocument } from './WorkspaceStore'

export interface SobakaWorkspaceMetadata {
  id: string
  created: string
  updated: string
  name: string
  creator: string
  updates: CID[]
}

export class SobakaWorkspace {
  public metadata: SobakaWorkspaceMetadata
  public doc: Y.Doc = new Y.Doc()

  private storage: SobakaStorage
  private key: KeyInfo | undefined
  private pending_updates: Uint8Array[] = []
  private process_updates: DebouncedFunc<() => Promise<void>>

  constructor(storage: SobakaStorage, metadata: SobakaWorkspaceMetadata, key?: KeyInfo) {
    this.storage = storage
    this.metadata = metadata
    this.key = key 

    this.process_updates = debounce(this._process_update.bind(this), 1000)
    this.doc.on('update', this.handle_update.bind(this))
  }

  static async init(storage: SobakaStorage): Promise<SobakaWorkspace> {
    const key = await storage.init_key()
    const creator = storage.get_client_id()
    const id = await storage.export_key(key)

    const metadata: SobakaWorkspaceMetadata = {
      id: id.toString(),
      created: new Date().toUTCString(),
      updated: new Date().toUTCString(),
      name: "Untitled Workspace",
      creator: creator.toString(),
      updates: []
    }

    await storage.publish_json(metadata, key)

    const workspace =  new SobakaWorkspace(storage, metadata, key)

    const collection = await storage.get_collection(storage.get_client_id())
    await collection.add(workspace)

    return workspace
  }

  static async from_id(storage: SobakaStorage, id: PeerId): Promise<SobakaWorkspace> {
    const key = await storage.find_key(id.toString())
    const metadata = await storage.resolve_json<SobakaWorkspaceMetadata>(id)
    const workspace = new SobakaWorkspace(storage, metadata, key)

    const collection = await storage.get_collection(storage.get_client_id())
    await collection.add(workspace)

    return workspace
  }

  public async init_store(): Promise<SobakaWorkspaceStore> {
    const updates = await Promise.all(this.metadata.updates.map(async (cid) =>
      this.storage.load_bytes(cid)
    ))

    Y.transact(this.doc, () => {
      Y.applyUpdate(this.doc, Y.mergeUpdates(updates), 'init')
    })

    return new SobakaWorkspaceStore(this)
  }

  private async _process_update(): Promise<void> {
    const updates = Y.mergeUpdates(this.pending_updates)
    this.pending_updates = []

    if (!this.key) {
      this.pending_updates = []
      return
    }

    const cid = await this.storage.add_bytes(updates)

    this.metadata.updated = new Date().toUTCString()
    this.metadata.updates.push(cid)

    const title = this.doc.getMap('metadata').get('title') as string | undefined
    if (title !== undefined) {
      this.metadata.name = title
    }

    this.storage.publish_json(this.metadata, this.key)
  }

  private async handle_update(update: Uint8Array, origin: unknown): Promise<void> {
    if (origin === 'init') return
    this.pending_updates.push(update)
    this.process_updates();
  }
}