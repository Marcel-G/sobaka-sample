/**
 * Topic - A lightweight wrapper for a communication channel
 * 
 * Topics use the shared PeerManager for connections. Multiple Topics
 * can share the same underlying RTCPeerConnection to a remote peer,
 * with each Topic having its own data channel.
 * 
 * This replaces the old "Room" concept with a more efficient design:
 * - Topics don't own peer connections
 * - They just manage subscriptions and message filtering
 * - Data channels are created/managed by PeerManager
 */

import { EventEmitter } from './EventEmitter'
import { PeerManager, type PeerManagerOptions } from './PeerManager'
import type { PeerKind, SignalingMessage } from './SignalingClient'

// ============================================================================
// Types
// ============================================================================

export interface TopicOptions {
  /** Topic name (used as data channel name) */
  name: string
  /** PeerManager options (only needed if PeerManager not yet initialized) */
  peerManager?: PeerManagerOptions
  /** Maximum connections (for compatibility, not enforced at topic level) */
  maxConns?: number
  /** Filter function for incoming messages */
  filterMessage?: (peerId: string, identity: string | undefined, data: Uint8Array) => boolean
}

export interface TopicPeer {
  peerId: string
  identity?: string
  kind?: PeerKind
  connected: boolean
}

export type TopicEvents = {
  /** Data received from a peer */
  data: (data: Uint8Array, peerId: string, identity: string | undefined) => void
  /** Topic synced (our identity verified by signaling server) */
  synced: (identity: string) => void
  /** Connected peers changed */
  peers: (peers: Map<string, TopicPeer>) => void
  /** Peer identity verified */
  'peer:identity': (peerId: string, identity: string, kind: PeerKind) => void
  /** Connected to signaling */
  'signaling:connect': () => void
  /** Disconnected from signaling */
  'signaling:disconnect': () => void
  /** Raw signaling message */
  'signaling:message': (message: SignalingMessage) => void
  /** Error occurred */
  error: (error: Error) => void
}

// ============================================================================
// Topic
// ============================================================================

export class Topic extends EventEmitter<TopicEvents> {
  readonly name: string
  private readonly peerManager: PeerManager
  private readonly filterMessage: TopicOptions['filterMessage']
  private readonly topicPeers = new Map<string, TopicPeer>()
  private _synced = false
  private _destroyed = false

  constructor(options: TopicOptions) {
    super()
    
    this.name = options.name
    this.filterMessage = options.filterMessage
    
    // Get or create PeerManager singleton
    if (options.peerManager) {
      this.peerManager = PeerManager.getInstance(options.peerManager)
    } else {
      this.peerManager = PeerManager.getInstance()
    }
    
    this.setupPeerManager()
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Connect to the topic (subscribe and start peer discovery)
   */
  connect(): void {
    if (this._destroyed) return
    
    console.debug('[Topic] Connecting to:', this.name)
    this.peerManager.connect()
    this.peerManager.subscribe(this.name)
  }

  /**
   * Disconnect from the topic
   */
  disconnect(): void {
    console.debug('[Topic] Disconnecting from:', this.name)
    this.peerManager.unsubscribe(this.name)
    this.topicPeers.clear()
    this._destroyed = true
  }

  /**
   * Broadcast data to all connected peers on this topic
   */
  broadcast(data: Uint8Array): void {
    this.peerManager.broadcast(this.name, data)
  }

  /**
   * Send data to a specific peer on this topic
   */
  sendTo(peerId: string, data: Uint8Array): boolean {
    return this.peerManager.sendTo(this.name, peerId, data)
  }

  /**
   * Get peer ID (from PeerManager)
   */
  get peerId(): string {
    return this.peerManager.peerId
  }

  /**
   * Get our verified identity
   */
  getIdentity(peerId: string): string | undefined {
    return this.peerManager.getPeerIdentity(peerId)?.identity
  }

  /**
   * Get connected peers for this topic
   */
  getConnectedPeers(): TopicPeer[] {
    return Array.from(this.topicPeers.values()).filter(p => p.connected)
  }

  /**
   * Check if connected to signaling
   */
  get isConnected(): boolean {
    return this.peerManager.isConnected
  }

  /**
   * Check if synced (our identity verified)
   */
  get isSynced(): boolean {
    return this._synced
  }

  // ============================================================================
  // Private: PeerManager Event Handling
  // ============================================================================

  private setupPeerManager(): void {
    // Signaling events
    this.peerManager.on('signaling:connect', () => {
      this.emit('signaling:connect')
    })
    
    this.peerManager.on('signaling:disconnect', () => {
      this.emit('signaling:disconnect')
    })
    
    this.peerManager.on('signaling:message', (message) => {
      this.emit('signaling:message', message)
    })
    
    // Identity events
    this.peerManager.on('identity', (identity) => {
      if (!this._synced) {
        this._synced = true
        this.emit('synced', identity)
      }
    })
    
    this.peerManager.on('peer:identity', (peerId, identity, kind) => {
      const peer = this.topicPeers.get(peerId)
      if (peer) {
        peer.identity = identity
        peer.kind = kind
      }
      this.emit('peer:identity', peerId, identity, kind)
    })
    
    // Channel events (filtered to this topic)
    this.peerManager.on('channel:open', (topic, peerId) => {
      if (topic !== this.name) return
      
      const identityInfo = this.peerManager.getPeerIdentity(peerId)
      const peer: TopicPeer = {
        peerId,
        identity: identityInfo?.identity,
        kind: identityInfo?.kind,
        connected: true
      }
      
      this.topicPeers.set(peerId, peer)
      this.emit('peers', this.topicPeers)
    })
    
    this.peerManager.on('channel:close', (topic, peerId) => {
      if (topic !== this.name) return
      
      this.topicPeers.delete(peerId)
      this.emit('peers', this.topicPeers)
    })
    
    // Data events (filtered to this topic)
    this.peerManager.on('channel:data', (topic, peerId, data) => {
      if (topic !== this.name) return
      
      const identityInfo = this.peerManager.getPeerIdentity(peerId)
      const identity = identityInfo?.identity
      
      // Apply message filter
      if (this.filterMessage && !this.filterMessage(peerId, identity, data)) {
        return
      }
      
      this.emit('data', data, peerId, identity)
    })
    
    // Error events
    this.peerManager.on('error', (err) => {
      this.emit('error', err)
    })
  }
}

export default Topic
