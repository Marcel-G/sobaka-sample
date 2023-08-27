import type { PeerId } from '@libp2p/interface-peer-id'
import type { KeyInfo } from '@libp2p/interface/keychain'
import { SobakaStorage } from '../worker/storage'
import { SobakaWorkspace } from './Workspace'
import { peerIdFromString } from '@libp2p/peer-id'

export interface SobakaCollectionMetadata {
  id: string
  items: string[]
}

export class SobakaCollection {
  public metadata: SobakaCollectionMetadata

  private storage: SobakaStorage
  private key: KeyInfo | null

  constructor(storage: SobakaStorage, metadata: SobakaCollectionMetadata, key?: KeyInfo) {
    this.storage = storage
    this.metadata = metadata
    this.key = key || null
  }

  static async from_id(storage: SobakaStorage, owner_id: PeerId): Promise<SobakaCollection> {
    const name = 'USER_COL_' + owner_id.toString()
    try {
      const key = await storage.find_key_by_name(name)
      if (!key) throw new Error('Key not found')
      const id = await storage.export_key(key)
      const metadata = await storage.resolve_json<SobakaCollectionMetadata>(id, { offline: true })
      console.log('Found collection', metadata)
      return new SobakaCollection(storage, metadata, key)
    } catch {
      const key = await storage.find_key_by_name(name) || await storage.init_key(name)
      const id = await storage.export_key(key)
      const collection = new SobakaCollection(storage, {
        id: id.toString(),
        items: []
      }, key)

      console.log('creating collection', collection)

      await storage.publish_json(collection.metadata, key)

      return collection
    }
  }

  public async list(): Promise<SobakaWorkspace[]> {
    const workspaces = await Promise.all(this.metadata.items.map(async (id) =>
      SobakaWorkspace.from_id(this.storage, peerIdFromString(id))
    ))

    return workspaces
  }

  public async add(workspace: SobakaWorkspace): Promise<void> {
    if (!this.key) throw new Error('Cannot mutate collection without key')
    const items = new Set(this.metadata.items)
    
    if (items.has(workspace.metadata.id)) return
    items.add(workspace.metadata.id)
    this.metadata.items = Array.from(items)

    console.log(this.metadata, this.key)
    await this.storage.publish_json(this.metadata, this.key)
  }

  public remove(workspace: SobakaWorkspace): void {
    if (!this.key) throw new Error('Cannot mutate collection without key')
    const items = new Set(this.metadata.items)

    if (!items.has(workspace.metadata.id)) return

    items.delete(workspace.metadata.id)
    this.metadata.items = Array.from(items)
    this.storage.publish_json(this.metadata, this.key)
  }
}