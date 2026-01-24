/**
 * YjsWebRTCProvider - Yjs document synchronization over WebRTC
 * 
 * A clean replacement for y-webrtc that:
 * - Syncs Yjs documents with peers via WebRTC
 * - Handles awareness protocol for presence
 * - Supports verified peer identities from signaling
 * - Provides message filtering for access control
 */

import * as Y from 'yjs'
import * as awarenessProtocol from 'y-protocols/awareness'
import * as syncProtocol from 'y-protocols/sync'
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'
import { EventEmitter } from './EventEmitter'
import { Room, type RoomOptions, type PeerConnection } from './Room'

// ============================================================================
// Protocol message types
// ============================================================================

const MESSAGE_SYNC = 0
const MESSAGE_AWARENESS = 1
const MESSAGE_QUERY_AWARENESS = 2

// ============================================================================
// Types
// ============================================================================

export interface YjsWebRTCProviderOptions {
  /** Room name for peer discovery */
  roomName: string
  /** Yjs document to sync */
  doc: Y.Doc
  /** Signaling server URL(s) */
  signaling: string[]
  /** Optional existing awareness instance */
  awareness?: awarenessProtocol.Awareness
  /** Maximum number of WebRTC connections */
  maxConns?: number
  /** ICE servers for WebRTC */
  iceServers?: RTCIceServer[]
  /** Filter for incoming messages based on identity */
  filterIncomingMessage?: (identity: string, data: Uint8Array) => boolean
}

export type YjsWebRTCProviderEvents = {
  /** Peer list changed */
  peers: (peers: Map<string, PeerConnection>) => void
  /** Synced with at least one peer */
  synced: (synced: boolean) => void
  /** User identity verified */
  user: (identity: string) => void
  /** Connected to signaling */
  status: (status: { connected: boolean }) => void
  /** Error occurred */
  error: (error: Error) => void
}

// ============================================================================
// YjsWebRTCProvider
// ============================================================================

export class YjsWebRTCProvider extends EventEmitter<YjsWebRTCProviderEvents> {
  readonly doc: Y.Doc
  readonly awareness: awarenessProtocol.Awareness
  readonly room: Room
  
  private synced = false
  private destroyed = false
  private currentUser: string | null = null
  private verifiedIdentities = new Map<string, string>()
  private readonly filterIncomingMessage: YjsWebRTCProviderOptions['filterIncomingMessage']

  constructor(options: YjsWebRTCProviderOptions) {
    super()
    
    this.doc = options.doc
    this.awareness = options.awareness ?? new awarenessProtocol.Awareness(options.doc)
    this.filterIncomingMessage = options.filterIncomingMessage
    
    // Create room
    this.room = new Room({
      name: options.roomName,
      signaling: options.signaling,
      maxConns: options.maxConns,
      iceServers: options.iceServers,
      filterMessage: this.createMessageFilter()
    })
    
    this.setupRoom()
    this.setupDoc()
    this.setupAwareness()
  }

  /**
   * Connect to the room and start syncing
   */
  connect(): void {
    this.room.connect()
  }

  /**
   * Disconnect from the room
   */
  disconnect(): void {
    this.room.disconnect()
  }

  /**
   * Destroy the provider
   */
  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    
    this.awareness.off('update', this.onAwarenessUpdate)
    this.doc.off('update', this.onDocUpdate)
    
    awarenessProtocol.removeAwarenessStates(
      this.awareness,
      [this.doc.clientID],
      null
    )
    
    this.room.disconnect()
    this.removeAllListeners()
  }

  /**
   * Get the peer ID
   */
  get peerId(): string {
    return this.room.peerId
  }

  /**
   * Get the current user's verified identity
   */
  get userIdentity(): string | null {
    return this.currentUser
  }

  /**
   * Get verified identity for a peer
   */
  getVerifiedIdentity(peerId: string): string | undefined {
    return this.verifiedIdentities.get(peerId)
  }

  /**
   * Check if connected
   */
  get connected(): boolean {
    return this.room.isConnected
  }

  // ============================================================================
  // Private methods
  // ============================================================================

  private setupRoom(): void {
    // Handle room sync (our identity verified)
    this.room.on('synced', (identity) => {
      if (identity && !this.currentUser) {
        this.currentUser = identity
        this.emit('user', identity)
      }
    })
    
    // Handle peer identity verification
    this.room.on('peer:identity', (peerId, identity, _kind) => {
      this.verifiedIdentities.set(peerId, identity)
    })
    
    // Handle peers change
    this.room.on('peers', (peers) => {
      this.emit('peers', peers)
      
      // Check if we need to sync with new peers
      for (const conn of peers.values()) {
        if (conn.connected) {
          this.syncWithPeer(conn.remotePeerId)
        }
      }
    })
    
    // Handle incoming data
    this.room.on('data', (data, peerId, identity) => {
      this.handleMessage(data, peerId, identity)
    })
    
    // Handle signaling status
    this.room.on('signaling:connect', () => {
      this.emit('status', { connected: true })
    })
    
    this.room.on('signaling:disconnect', () => {
      this.emit('status', { connected: false })
    })
    
    // Handle errors
    this.room.on('error', (err) => {
      this.emit('error', err)
    })
  }

  private setupDoc(): void {
    this.doc.on('update', this.onDocUpdate)
  }

  private setupAwareness(): void {
    this.awareness.on('update', this.onAwarenessUpdate)
  }

  private onDocUpdate = (update: Uint8Array, origin: unknown): void => {
    if (origin === this) return
    
    // Broadcast sync update to all peers
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, MESSAGE_SYNC)
    syncProtocol.writeUpdate(encoder, update)
    
    this.room.broadcast(encoding.toUint8Array(encoder))
  }

  private onAwarenessUpdate = ({ added, updated, removed }: {
    added: number[]
    updated: number[]
    removed: number[]
  }, origin: unknown): void => {
    const changedClients = added.concat(updated, removed)
    
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS)
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients)
    )
    
    this.room.broadcast(encoding.toUint8Array(encoder))
  }

  private syncWithPeer(peerId: string): void {
    // Send sync step 1
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, MESSAGE_SYNC)
    syncProtocol.writeSyncStep1(encoder, this.doc)
    
    this.room.sendTo(peerId, encoding.toUint8Array(encoder))
    
    // Send awareness query
    const awarenessEncoder = encoding.createEncoder()
    encoding.writeVarUint(awarenessEncoder, MESSAGE_QUERY_AWARENESS)
    this.room.sendTo(peerId, encoding.toUint8Array(awarenessEncoder))
  }

  private handleMessage(data: Uint8Array, peerId: string, identity: string | undefined): void {
    try {
      const decoder = decoding.createDecoder(data)
      const messageType = decoding.readVarUint(decoder)
      
      switch (messageType) {
        case MESSAGE_SYNC:
          this.handleSyncMessage(decoder, peerId)
          break
          
        case MESSAGE_AWARENESS:
          this.handleAwarenessMessage(decoder)
          break
          
        case MESSAGE_QUERY_AWARENESS:
          this.handleAwarenessQuery(peerId)
          break
          
        default:
          console.warn(`[YjsProvider] Unknown message type: ${messageType}`)
      }
    } catch (err) {
      console.error('[YjsProvider] Error handling message:', err)
    }
  }

  private handleSyncMessage(decoder: decoding.Decoder, peerId: string): void {
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, MESSAGE_SYNC)
    
    const syncMessageType = syncProtocol.readSyncMessage(decoder, encoder, this.doc, this)
    
    // If we have a response to send
    if (encoding.length(encoder) > 1) {
      this.room.sendTo(peerId, encoding.toUint8Array(encoder))
    }
    
    // Mark as synced after receiving sync step 2
    if (syncMessageType === syncProtocol.messageYjsSyncStep2 && !this.synced) {
      this.synced = true
      this.emit('synced', true)
    }
  }

  private handleAwarenessMessage(decoder: decoding.Decoder): void {
    const update = decoding.readVarUint8Array(decoder)
    awarenessProtocol.applyAwarenessUpdate(this.awareness, update, this)
  }

  private handleAwarenessQuery(peerId: string): void {
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS)
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(
        this.awareness,
        Array.from(this.awareness.getStates().keys())
      )
    )
    
    this.room.sendTo(peerId, encoding.toUint8Array(encoder))
  }

  private createMessageFilter(): RoomOptions['filterMessage'] {
    if (!this.filterIncomingMessage) {
      return undefined
    }
    
    return (peerId: string, identity: string | undefined, data: Uint8Array): boolean => {
      // Always allow if no identity filter or identity not verified
      if (!identity) return true
      
      // Check if this is a read-only message type
      if (this.isReadOnlyMessage(data)) {
        return true
      }
      
      // Apply custom filter
      return this.filterIncomingMessage!(identity, data)
    }
  }

  private isReadOnlyMessage(data: Uint8Array): boolean {
    if (data.length < 2) return false
    
    const [byte1, byte2] = data
    
    // Allow SyncStep1 messages ([0, 0, ...])
    if (byte1 === MESSAGE_SYNC && byte2 === syncProtocol.messageYjsSyncStep1) {
      return true
    }
    
    // Allow awareness messages
    if (byte1 === MESSAGE_AWARENESS || byte1 === MESSAGE_QUERY_AWARENESS) {
      return true
    }
    
    return false
  }
}

// ============================================================================
// Convenience factory function
// ============================================================================

/**
 * Create a new YjsWebRTCProvider
 */
export function createYjsWebRTCProvider(options: YjsWebRTCProviderOptions): YjsWebRTCProvider {
  const provider = new YjsWebRTCProvider(options)
  provider.connect()
  return provider
}
