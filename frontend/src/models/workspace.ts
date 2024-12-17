import * as Y from 'yjs'

import syncedStore from '@syncedstore/core'
import { DocTypeDescription, MappedTypeDescription } from '@syncedstore/core/types/doc'
import { derived, Readable } from 'svelte/store'

import { cloneDeep } from 'lodash'
import { INITIAL_STATE, ModuleUI } from '../modules'
import { intoReadable } from '../util/store'
import { SubDocReference } from '../util/subdoc'
import { Position } from '../@types'
import { IndexeddbPersistence } from 'y-indexeddb'
import { Room, WebrtcConn, WebrtcProvider } from 'y-webrtc'

export type WorkspaceMeta = {
  title: string
  createdAt: string
  updatedAt: string
  collaborators: string[]
}

export interface WorkspaceDoc extends DocTypeDescription {
  meta: WorkspaceMeta
  modules: Array<Module>
  links: Array<Required<Link>>
}

export interface Module {
  id: string
  type: ModuleUI
  state: Record<string, unknown> // Needs to be mutable from inside a module
  position: {
    x: number
    y: number
  }
}
export interface Link {
  // Unique ID for this link
  id?: string
  // Plug ID from which to link.
  from: string
  // Plug ID to link to.
  to: string
}

type WorkspaceStore = {
  meta: WorkspaceMeta
  modules: Array<Module>
  links: Array<Required<Link>>
}

const WORKSPACE_STORE_SHAPE = {
  meta: {} as WorkspaceMeta,
  modules: [],
  links: []
}

function patchRoom(
  room: Room,
  conns: WeakSet<WebrtcConn>,
  isReadOnly: (roomId: string) => boolean
) {
  for (const conn of room?.webrtcConns?.values() || []) {
    if (conns.has(conn)) continue

    const existingListeners: Array<(data: Uint8Array) => void> = conn.peer.listeners('data');
    existingListeners.forEach((listener) => conn.peer.off('data', listener));

    conn.peer.on('data', (data: Uint8Array) => {
      // Apply your filtering logic
      if (!isReadOnly(conn.remotePeerId) || isReadOnlyMessage(data)) {
        // Call the original listeners with the (optionally transformed) data
        existingListeners.forEach(listener => listener(data));
      } else {
        console.warn('Filtered message');
      }
    });

    conns.add(conn)
  }
}

// Example filtering function
function isReadOnlyMessage(data: Uint8Array) {
  const [byte1, byte2] = data;

  // It suffices to read the first two bytes in order to determine whether a message should be accepted from a read-only user.
  // https://github.com/yjs/y-protocols/blob/40dbe4eebb1e53a7e86932ef3232f9abd5037569/PROTOCOL.md?plain=1#L100-L111

  // Allow only SyncStep1 messages ([0, 0, ...])
  return (byte1 === 0 && byte2 === 0)
}

export class Workspace {
  private store: MappedTypeDescription<WorkspaceStore>
  private user: null | string = null 

  constructor(private doc: Y.Doc) {
    this.store = syncedStore(WORKSPACE_STORE_SHAPE, doc)

    this.doc.on('synced', () => {
      this.populate()

      this.doc.on('update', (_, origin) => {
        if (origin === this) return
        this.doc.transact(() => {
          this.handleDocumentUpdated()
        }, this)
      })
    })
  }

  static create(doc: Y.Doc = new Y.Doc()) {
    return new Workspace(doc)
  }

  static fromId(id: string) {
    return new Workspace(new Y.Doc({ guid: id }))
  }

  static fromRef(ref: SubDocReference) {
    return new Workspace(new Y.Doc(ref))
  }

  intoRef(): SubDocReference {
    return { guid: this.doc.guid }
  }

  get id() {
    return this.doc.guid
  }

  /**
   * Loads entity from local storage
   */
  async load() {
    this.storageSynced()
    this.doc.load()
    await new Promise(resolve => this.doc.on('synced', resolve))
    return this
  }

  storageSynced(): Workspace {
    const provider = new IndexeddbPersistence(this.doc.guid, this.doc)
    provider.on('synced', () => {
      this.doc.emit('synced', [this])
    })
    return this
  }

  remoteSynced(): Workspace {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const provider = new WebrtcProvider(this.doc.guid, this.doc, {
      signaling: ['ws://localhost:8000/signaling'],
    })

    const conns = new WeakSet<WebrtcConn>()
    const verifiedPeers = new Map<string, string>();
    for (const signal of provider.signalingConns) {
      signal.on('message', (message: { type: string, identity: string, data: any }) => {
        if (message.type === "publish") {
          if (!verifiedPeers.has(message.data.from)) {
            verifiedPeers.set(message.data.from, message.identity);
            // TODO: cleanup after we loose connection to peer
            
            if (provider.room && verifiedPeers.has(provider.room.peerId)) {
              this.user = verifiedPeers.get(provider.room.peerId) || null;

              // TODO: assign user as owner before sharing
            }
          }
        }
      });
    }

    const isReadOnly = (peerId: string) => {
      const collaborators = this.store.meta.collaborators || [];
      if (collaborators.length === 0) {
        return false;
      }
      if (verifiedPeers.has(peerId)) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const identity = verifiedPeers.get(peerId)!;

        return !collaborators.includes(identity);
      }

      return true
    }

    provider.on('peers', () => {
        if (provider.room) {
          patchRoom(provider.room, conns, isReadOnly)
        }
    });

    // TODO: reactively disable updates to doc in readonly mode
    // const errorOnReadOnly = () => {
    //   throw new Error('Updates are not allowed in read only mode')
    // }
    // effect(() => {
    //  if (isReadOnly()) {
    //    this.doc.on('beforeTransaction', errorOnReadOnly);
    //  } else {
    //    this.doc.off('beforeTransaction', errorOnReadOnly);
    //  }
    // });

    return this
  }

  private handleDocumentUpdated() {
    const { meta } = this.store

    meta.updatedAt ??= new Date().toISOString()
  }

  private populate() {
    const { meta } = this.store

    meta.title ??= 'Untitled Workspace'
    meta.createdAt ??= new Date().toISOString()
    meta.updatedAt ??= new Date().toISOString()
    meta.collaborators ??= []
  }

  private get storeReactive() {
    return intoReadable(this.store)
  }

  get meta(): Readable<WorkspaceMeta> {
    // TODO: meta may be empty until synced
    return derived(this.storeReactive, store => store.meta as WorkspaceMeta)
  }

  get links(): Readable<Required<Link>[]> {
    return derived(this.storeReactive, store => store.links)
  }

  get modules(): Readable<Module[]> {
    return derived(this.storeReactive, store => store.modules)
  }

  // Module actions
  create_module(type: ModuleUI, position: { x: number; y: number }): string {
    const id = crypto.randomUUID()

    const { modules } = this.store

    if (modules) {
      modules.push({
        id,
        type,
        // TS doesn't know about svelte module imports - https://github.com/sveltejs/svelte/issues/5817
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        state: INITIAL_STATE[type],
        position
      })
    }

    return id
  }

  move_module(id: string, x: number, y: number): boolean {
    const { modules } = this.store

    const module = modules.find(module => module.id === id)
    if (module) {
      module.position.x = x
      module.position.y = y

      // Make the module the last in the list so that it's rendered on top.
      const index = modules.indexOf(module)
      if (index !== modules.length - 1) {
        // clone the module so it can be re-inserted without "Not supported: reassigning object that already occurs in the tree."
        // https://github.com/YousefED/SyncedStore/issues/87#issue-1487084868
        const copy = cloneDeep(module)

        modules.splice(index, 1)
        modules.push(copy)
      }
    }

    return true
  }

  remove_module(id: string) {
    const { modules } = this.store

    const index = modules.findIndex(module => module.id === id)
    if (index >= 0) {
      modules.splice(index, 1)
    }
  }

  clone_module(id: string) {
    const { modules } = this.store

    const module = modules.find(module => module.id === id)

    if (module) {
      modules.push({
        ...cloneDeep(module),
        id: crypto.randomUUID(),
        position: {
          x: module.position.x + 1,
          y: module.position.y + 1
        }
      })
    }
  }

  // Module selectors
  module_position(id: string): Readable<Position> {
    return derived(intoReadable(this.store.modules), modules => {
      const mod = modules.find(module => module.id === id)
      if (mod) {
        return mod.position
      } else {
        return { x: 0, y: 0 }
      }
    })
  }

  // Link actions
  add_link(link: Link): string {
    const id = crypto.randomUUID()
    const { links } = this.store

    links.push({ id, ...link })

    return id
  }

  remove_link(link_id: string) {
    const { links } = this.store
    const index = links.findIndex(link => link.id === link_id)
    if (index >= 0) {
      links.splice(index, 1)
    }
  }

  cleanup() {
    // TODO: do I really want to do this?
    this.doc.destroy()
  }
}
