/**
 * VerifiedRTCProvider - Yjs document synchronization over WebRTC with identity verification
 * 
 * This is a unified provider that combines:
 * - Yjs document synchronization
 * - Awareness protocol for presence
 * - Verified peer identities from signaling server
 * - Message filtering for access control
 * 
 * Uses the optimized PeerManager/Topic architecture where:
 * - Multiple topics share the same RTCPeerConnection to each peer
 * - Each topic has its own data channel on the shared connection
 */

import * as Y from 'yjs'
import * as awarenessProtocol from 'y-protocols/awareness'
import * as syncProtocol from 'y-protocols/sync'
import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'
import { EventEmitter } from './webrtc/EventEmitter.ts'
import { Topic, type TopicPeer } from './webrtc/Topic.ts'
import { PeerManager } from './webrtc/PeerManager.ts'
import type { PeerKind, SignalingMessage } from './webrtc/SignalingClient.ts'
import { createLogger } from '../util/logger'

const logger = createLogger('VerifiedRTCProvider')

// ============================================================================
// Protocol message types (from y-protocols)
// ============================================================================

const MESSAGE_SYNC = 0
const MESSAGE_AWARENESS = 1
const MESSAGE_QUERY_AWARENESS = 2

// ============================================================================
// Types
// ============================================================================

export interface VerifiedRTCProviderOptions {
  /** Maximum number of WebRTC connections */
  maxConns?: number
  /** Signaling server URL(s) */
  signaling: string[]
  /** ICE servers for WebRTC */
  iceServers?: RTCIceServer[]
  /** Optional existing awareness instance */
  awareness?: awarenessProtocol.Awareness
  /** Filter for incoming messages based on verified identity */
  filterIncomingMessage?: (identity: string, data: Uint8Array) => boolean
}

export type VerifiedRTCProviderEvents = {
  /** Peer list changed */
  peers: (peers: Map<string, TopicPeer>) => void
  /** User identity verified by signaling server */
  user: (identity: string) => void
  /** Welcome message with identity and role */
  welcome: (identity: string, kind: PeerKind) => void
  /** Synced with at least one peer */
  synced: (synced: boolean) => void
  /** Connection status changed */
  status: (status: { connected: boolean }) => void
  /** Error occurred */
  error: (error: Error) => void
}

// ============================================================================
// VerifiedRTCProvider
// ============================================================================

export class VerifiedRTCProvider extends EventEmitter<VerifiedRTCProviderEvents> {
  readonly doc: Y.Doc
  readonly awareness: awarenessProtocol.Awareness
  readonly topic: Topic
  readonly roomName: string
  
  private _synced = false
  private _destroyed = false
  private _shouldConnect = false
  private currentUser: string | null = null
  
  // Track identities by kind (client vs worker)
  private verifiedPeerIdentities = new Map<string, string>()
  private verifiedWorkerIdentities = new Map<string, string>()
  
  private readonly _filterIncomingMessage: VerifiedRTCProviderOptions['filterIncomingMessage']
  
  // Track which peers we've synced with
  private syncedPeers = new Set<string>()

  constructor(
    roomName: string,
    doc: Y.Doc,
    options: VerifiedRTCProviderOptions
  ) {
    super()
    
    this.roomName = roomName
    this.doc = doc
    this.awareness = options.awareness ?? new awarenessProtocol.Awareness(doc)
    this._filterIncomingMessage = options.filterIncomingMessage
    
    // Create topic using shared PeerManager
    this.topic = new Topic({
      name: roomName,
      peerManager: {
        signaling: options.signaling,
        iceServers: options.iceServers
      },
      filterMessage: this.createMessageFilter()
    })
    
    this.setupTopic()
    this.setupDoc()
    this.setupAwareness()
    this.setupBeforeUnload()
    
    // Auto-connect (like the original y-webrtc)
    console.debug('[VerifiedRTCProvider] Created for topic:', roomName, 'signaling:', options.signaling)
    this.connect()
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Connect to the topic and start syncing
   */
  connect(): void {
    this._shouldConnect = true
    this.topic.connect()
  }

  /**
   * Disconnect from the topic
   */
  disconnect(): void {
    this._shouldConnect = false
    this.topic.disconnect()
    
    // Remove our awareness state
    awarenessProtocol.removeAwarenessStates(
      this.awareness,
      [this.doc.clientID],
      'disconnect'
    )
  }

  /**
   * Destroy the provider and clean up all resources
   */
  destroy(): void {
    if (this._destroyed) return
    this._destroyed = true
    
    this.doc.off('destroy', this.destroy)
    this.awareness.off('update', this.onAwarenessUpdate)
    this.doc.off('update', this.onDocUpdate)
    
    this.disconnect()
    this.removeAllListeners()
  }

  /**
   * Check if connected to signaling and looking for peers
   */
  get connected(): boolean {
    return this.topic.isConnected && this._shouldConnect
  }

  /**
   * Get the peer ID (used for signaling)
   */
  get peerId(): string {
    return this.topic.peerId
  }

  /**
   * Get current user's verified identity (UUID from signaling server)
   */
  get userIdentity(): string | null {
    return this.currentUser
  }

  /**
   * Get verified identity for a peer
   */
  getVerifiedIdentity(peerId: string): string | undefined {
    return this.verifiedPeerIdentities.get(peerId) ?? 
           this.verifiedWorkerIdentities.get(peerId)
  }

  /**
   * Check if a peer is a worker
   */
  isWorker(peerId: string): boolean {
    return this.verifiedWorkerIdentities.has(peerId)
  }

  /**
   * Get the topic (replaces old 'room' property)
   */
  get room(): Topic {
    return this.topic
  }

  /**
   * Get signaling connections (for compatibility with old API)
   */
  get signalingConns(): Array<{ 
    on: (event: string, handler: (...args: unknown[]) => void) => void 
  }> {
    return [{
      on: (event: string, handler: (...args: unknown[]) => void) => {
        if (event === 'connect') {
          this.topic.on('signaling:connect', handler as () => void)
        } else if (event === 'disconnect') {
          this.topic.on('signaling:disconnect', handler as () => void)
        } else if (event === 'message') {
          this.topic.on('signaling:message', handler as (message: SignalingMessage) => void)
        }
      }
    }]
  }

  // ============================================================================
  // Private: Topic setup
  // ============================================================================

  private setupTopic(): void {
    // Handle welcome message with identity and role
    this.topic.on('welcome', (identity, kind) => {
      if (!this.currentUser) {
        this.currentUser = identity
        this.emit('user', identity)
      }
      this.emit('welcome', identity, kind)
    })
    
    // Handle identity verification (our own identity confirmed by signaling)
    // This is a fallback for older signaling servers
    this.topic.on('synced', (identity) => {
      if (identity && !this.currentUser) {
        this.currentUser = identity
        this.emit('user', identity)
      }
    })
    
    // Track peer identities by kind
    this.topic.on('peer:identity', (peerId, identity, kind) => {
      if (kind === 'worker') {
        this.verifiedWorkerIdentities.set(peerId, identity)
      } else {
        this.verifiedPeerIdentities.set(peerId, identity)
      }
    })
    
    // Handle peer connections
    this.topic.on('peers', (peers) => {
      this.emit('peers', peers)
      
      // Initiate sync with newly connected peers
      for (const peer of peers.values()) {
        if (peer.connected && !this.syncedPeers.has(peer.peerId)) {
          this.syncWithPeer(peer.peerId)
          this.syncedPeers.add(peer.peerId)
        }
      }
      
      // Clean up synced peers that disconnected
      for (const peerId of this.syncedPeers) {
        if (!peers.has(peerId)) {
          this.syncedPeers.delete(peerId)
        }
      }
    })
    
    // Handle incoming data from peers
    this.topic.on('data', (data, peerId, identity) => {
      this.handleMessage(data, peerId, identity)
    })
    
    // Handle signaling connection status
    this.topic.on('signaling:connect', () => {
      this.emit('status', { connected: true })
    })
    
    this.topic.on('signaling:disconnect', () => {
      this.emit('status', { connected: false })
    })
    
    // Forward errors
    this.topic.on('error', (err) => {
      this.emit('error', err)
    })
  }

  // ============================================================================
  // Private: Yjs document sync
  // ============================================================================

  private setupDoc(): void {
    this.doc.on('update', this.onDocUpdate)
    this.doc.on('destroy', this.destroy.bind(this))
  }

  private onDocUpdate = (update: Uint8Array, origin: unknown): void => {
    // Don't broadcast updates that originated from this provider
    if (origin === this) return
    
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, MESSAGE_SYNC)
    syncProtocol.writeUpdate(encoder, update)
    
    this.topic.broadcast(encoding.toUint8Array(encoder))
  }

  private syncWithPeer(peerId: string): void {
    // Send sync step 1
    const syncEncoder = encoding.createEncoder()
    encoding.writeVarUint(syncEncoder, MESSAGE_SYNC)
    syncProtocol.writeSyncStep1(syncEncoder, this.doc)
    this.topic.sendTo(peerId, encoding.toUint8Array(syncEncoder))
    
    // Send awareness query
    const awarenessEncoder = encoding.createEncoder()
    encoding.writeVarUint(awarenessEncoder, MESSAGE_QUERY_AWARENESS)
    this.topic.sendTo(peerId, encoding.toUint8Array(awarenessEncoder))
  }

  // ============================================================================
  // Private: Awareness protocol
  // ============================================================================

  private setupAwareness(): void {
    this.awareness.on('update', this.onAwarenessUpdate)
  }

  private onAwarenessUpdate = ({ added, updated, removed }: {
    added: number[]
    updated: number[]
    removed: number[]
  }): void => {
    const changedClients = added.concat(updated, removed)
    
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS)
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(this.awareness, changedClients)
    )
    
    this.topic.broadcast(encoding.toUint8Array(encoder))
  }

  // ============================================================================
  // Private: Message handling
  // ============================================================================

  private handleMessage(data: Uint8Array, peerId: string, _identity: string | undefined): void {
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
          logger.warn(`Unknown message type: ${messageType}`)
      }
    } catch (err) {
      logger.error('Error handling message:', err)
    }
  }

  private handleSyncMessage(decoder: decoding.Decoder, peerId: string): void {
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, MESSAGE_SYNC)
    
    const syncMessageType = syncProtocol.readSyncMessage(decoder, encoder, this.doc, this)
    
    // Send response if we have one
    if (encoding.length(encoder) > 1) {
      this.topic.sendTo(peerId, encoding.toUint8Array(encoder))
    }
    
    // Mark as synced after receiving sync step 2 from a peer
    if (syncMessageType === syncProtocol.messageYjsSyncStep2 && !this._synced) {
      this._synced = true
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
    
    this.topic.sendTo(peerId, encoding.toUint8Array(encoder))
  }

  // ============================================================================
  // Private: Message filtering
  // ============================================================================

  private createMessageFilter(): ((peerId: string, identity: string | undefined, data: Uint8Array) => boolean) | undefined {
    if (!this._filterIncomingMessage) {
      return undefined
    }
    
    return (peerId: string, identity: string | undefined, data: Uint8Array): boolean => {
      // Always allow if identity not yet verified
      if (!identity) return true
      
      // Allow all messages from workers
      if (this.verifiedWorkerIdentities.has(peerId)) {
        return true
      }
      
      // Allow read-only messages from anyone
      if (this.isReadOnlyMessage(data)) {
        return true
      }
      
      // Apply custom filter
      return this._filterIncomingMessage!(identity, data)
    }
  }

  private isReadOnlyMessage(data: Uint8Array): boolean {
    if (data.length < 2) return false
    
    const [byte1, byte2] = data
    
    // Allow SyncStep1 messages ([0, 0, ...])
    // https://github.com/yjs/y-protocols/blob/master/PROTOCOL.md
    if (byte1 === MESSAGE_SYNC && byte2 === syncProtocol.messageYjsSyncStep1) {
      return true
    }
    
    // Allow awareness messages
    if (byte1 === MESSAGE_AWARENESS || byte1 === MESSAGE_QUERY_AWARENESS) {
      return true
    }
    
    return false
  }

  // ============================================================================
  // Private: Cleanup
  // ============================================================================

  private setupBeforeUnload(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.onBeforeUnload)
    }
  }

  private onBeforeUnload = (): void => {
    awarenessProtocol.removeAwarenessStates(
      this.awareness,
      [this.doc.clientID],
      'window unload'
    )
    this.disconnect()
  }
}

export default VerifiedRTCProvider
