import type { PeerId } from '@libp2p/interface-peer-id'
import type { KeyInfo } from '@libp2p/interface/keychain'
import { SobakaStorage } from '../worker/storage'
import { SobakaWorkspace } from './Workspace'
import { peerIdFromString } from '@libp2p/peer-id'
import { CID } from 'multiformats/cid'
import { SobakaMediaManager } from './MediaManager'

export interface SobakaMediaMetadata {
  id: string
  items: string[]
}

export class SobakaMediaCollection {
  public metadata: SobakaMediaMetadata

  private storage: SobakaStorage
  private key: KeyInfo | null

  constructor(storage: SobakaStorage,  metadata: SobakaMediaMetadata, key?: KeyInfo) {
    this.storage = storage
    this.metadata = metadata
    this.key = key || null
  }

  static async from_id(storage: SobakaStorage, owner_id: PeerId): Promise<SobakaMediaCollection> {
    const name = 'USER_MEDIA_' + owner_id.toString()
    try {
      const key = await storage.find_key_by_name(name)
      if (!key) throw new Error('Key not found')
      const id = await storage.export_key(key)
      const metadata = await storage.resolve_json<SobakaMediaMetadata>(id, { offline: true })
      console.log('Found collection', metadata)
      return new SobakaMediaCollection(storage, metadata, key)
    } catch {
      const key = await storage.find_key_by_name(name) || await storage.init_key(name)
      const id = await storage.export_key(key)
      const collection = new SobakaMediaCollection(storage, {
        id: id.toString(),
        items: []
      }, key)

      console.log('creating collection', collection)

      await storage.publish_json(collection.metadata, key)

      return collection
    }
  }

  public async list(): Promise<CID[]> {
    const files = await Promise.all(this.metadata.items.map(async (id) => CID.parse(id)))
    return files;
  }

  public async add(id: CID): Promise<void> {
    if (!this.key) throw new Error('Cannot mutate collection without key')
    const items = new Set(this.metadata.items)

    if (items.has(id.toString())) return
    items.add(id.toString())
    this.metadata.items = Array.from(items)

    await this.storage.publish_json(this.metadata, this.key)
  }

  public async remove(id: CID): Promise<void> {
    if (!this.key) throw new Error('Cannot mutate collection without key')
    const items = new Set(this.metadata.items)

    if (!items.has(id.toString())) return

    items.delete(id.toString())
    this.metadata.items = Array.from(items)
    await this.storage.publish_json(this.metadata, this.key)
  }
}