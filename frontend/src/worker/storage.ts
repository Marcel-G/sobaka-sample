import type { PubSub } from '@libp2p/interface-pubsub'
import type { KeyInfo } from '@libp2p/interface/keychain'
import type { PeerId } from "@libp2p/interface-peer-id"
import type { CID } from 'multiformats/cid'
import type { Libp2p } from 'libp2p';

import pRetry from 'p-retry';
import toBuffer from 'it-to-buffer';
import { createHelia, Helia } from "helia"
import { dagJson, type DAGJSON } from "@helia/dag-json"
import { dht, pubsub } from "@helia/ipns/routing"
import { ipns, type IPNS } from "@helia/ipns"
import { unixfs, type UnixFS } from "@helia/unixfs"
import { IDBBlockstore } from "blockstore-idb"
import { IDBDatastore } from "datastore-idb"

import { SobakaWorkspace } from "../models/Workspace";
import { createLibp2p } from './network'
import { SobakaWorkspaceCollection } from '../models/WorkspaceCollection';

let storage: Promise<SobakaStorage> | SobakaStorage

export const get_storage = async () => {
  return storage ??= (async () => {
    const blockstore = new IDBBlockstore('blockstore')
    const datastore = new IDBDatastore('datastore')

    await blockstore.open()
    await datastore.open()

    // libp2p is the networking layer that underpins Helia
    const libp2p = await createLibp2p(
      datastore
    )

    // create a Helia node
    const helia = await createHelia({
      datastore: datastore,
      blockstore: blockstore as any,
      libp2p
    })

    return new SobakaStorage(helia as any)
  })();
}

export class SobakaStorage {
  private helia: Helia<Libp2p>
  private json: DAGJSON
  private name: IPNS
  private file: UnixFS
  private key_cache: Map<KeyInfo, PeerId> = new Map()

  constructor(helia: Helia<Libp2p<{ pubsub: PubSub }>>) {
    this.helia = helia
    this.json = dagJson(helia)
    this.name = ipns(helia, [dht(helia), pubsub(helia)])
    this.file = unixfs(helia)
    this.key_cache = new Map()
  }

  /**
   * Initialise a new workspace from scratch
   */
  public async init_workspace(): Promise<SobakaWorkspace> {
    return SobakaWorkspace.init(this)
  }

  /**
   * Load an existing workspace from local storage or network
   */
  public async get_workspace(id: PeerId): Promise<SobakaWorkspace> {
    return SobakaWorkspace.from_id(this, id)
  }

  public async get_collection(id: PeerId): Promise<SobakaWorkspaceCollection> {
    return SobakaWorkspaceCollection.from_id(this, id)
  }

  public async init_key(name: string = crypto.randomUUID()): Promise<KeyInfo> {
    return this.helia.libp2p.keychain.createKey(name, 'RSA')
  }

  public async find_key_by_name(name: string): Promise<KeyInfo | undefined> {
    try {
      const key = await this.helia.libp2p.keychain.findKeyByName(name)
      return key
    } catch (e) {
      console.warn(`Key ${name} not found`)
      return
    }
  }

  public async find_key(id: string): Promise<KeyInfo | undefined> {
    try {
      const key = await this.helia.libp2p.keychain.findKeyById(id)
      return key
    } catch (e) {
      console.warn(`Key for ${id} not found`)
      return
    }
  }

  public get_client_id(): PeerId {
    return this.helia.libp2p.peerId
  }

  public async export_key(key: KeyInfo): Promise<PeerId> {
    if (!this.key_cache.has(key)) {
      this.key_cache.set(key, await this.helia.libp2p.keychain.exportPeerId(key.name))
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.key_cache.get(key)!
  }

  public async resolve_json<T>(id: PeerId, options?: { offline: boolean }): Promise<T> {
    const cid = await pRetry(async () => await this.name.resolve(id, options), { retries: 2 });

    return pRetry(async () => {
      const signal = AbortSignal.timeout(500);
      return this.json.get<T>(cid, { signal })
    }, { retries: 5 })
  }

  // move publish to workspace class
  public async publish_json(data: unknown, key: KeyInfo): Promise<void> {
    const cid = await this.json.add(data)

    const key_id = await this.export_key(key)

    await this.name.publish(key_id, cid, {
      offline: true
    })
  }

  // move to workspace class
  public async load_bytes(cid: CID): Promise<Uint8Array> {
    return pRetry(async () => {
      const signal = AbortSignal.timeout(500);
      return toBuffer(this.file.cat(cid, { signal }))
    }, { retries: 5 })
  }

  public async add_bytes(data: Uint8Array): Promise<CID> {
    return this.file.addBytes(data)
  }

  public async add_file(file: File): Promise<CID> {
    return this.file.addFile({
      path: file.name,
      content: new Uint8Array(await file.arrayBuffer())
    })
  }

  public async load_file(cid: CID): Promise<File> {
    // Load raw file as bytes from storage
    const bytes = await this.load_bytes(cid)

    // Convert bytes to file
    const blob = new Blob([bytes])
    return new File([blob], cid.toString())
  }

  // @todo
  private async wait_for_connection(): Promise<void> {
    if (this.helia.libp2p.getMultiaddrs().length > 0) return
    // @todo timeout 
    return new Promise<void>((resolve) => {
      this.helia.libp2p.addEventListener('self:peer:update', () => {
        if (this.helia.libp2p.getMultiaddrs().length > 0) { resolve() }
      });
    })
  }
}