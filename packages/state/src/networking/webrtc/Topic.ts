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
import { SignalingClient, type PeerKind, type SignalingMessage } from './SignalingClient'
import { createLogger } from '../../util/logger'

const logger = createLogger('Topic')

// ============================================================================
// Types
// ============================================================================

export interface TopicOptions {
  /** Topic name (used as data channel name) */
  name: string
  /** PeerManager options (only needed if PeerManager not yet initialized) */
  peerManager?: PeerManagerOptions
  /** Pre-created SignalingClient instance(s) to use - takes precedence */
  signalingClients?: SignalingClient[]
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
  /** Welcome message with our identity and role */
  welcome: (identity: string, kind: PeerKind) => void
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
  
  // Store bound handlers for cleanup
  private readonly boundHandlers: {
    onSignalingConnect: () => void
    onSignalingDisconnect: () => void
    onSignalingMessage: (message: SignalingMessage) => void
    onWelcome: (identity: string, kind: PeerKind) => void
    onIdentity: (identity: string) => void
    onPeerIdentity: (peerId: string, identity: string, kind: PeerKind) => void
    onChannelOpen: (topic: string, peerId: string) => void
    onChannelClose: (topic: string, peerId: string) => void
    onChannelData: (topic: string, peerId: string, data: Uint8Array) => void
    onError: (error: Error) => void
  }

  constructor(options: TopicOptions) {
    super()
    
    this.name = options.name
    this.filterMessage = options.filterMessage
    
    // Get or create PeerManager singleton
    // Priority: signalingClients > peerManager options > existing singleton
    if (options.signalingClients) {
      this.peerManager = PeerManager.getInstance({ 
        signalingClients: options.signalingClients,
        ...options.peerManager 
      })
    } else if (options.peerManager) {
      this.peerManager = PeerManager.getInstance(options.peerManager)
    } else {
      this.peerManager = PeerManager.getInstance()
    }
    
    // Create bound handlers for later cleanup
    this.boundHandlers = {
      onSignalingConnect: this.handleSignalingConnect.bind(this),
      onSignalingDisconnect: this.handleSignalingDisconnect.bind(this),
      onSignalingMessage: this.handleSignalingMessage.bind(this),
      onWelcome: this.handleWelcome.bind(this),
      onIdentity: this.handleIdentity.bind(this),
      onPeerIdentity: this.handlePeerIdentity.bind(this),
      onChannelOpen: this.handleChannelOpen.bind(this),
      onChannelClose: this.handleChannelClose.bind(this),
      onChannelData: this.handleChannelData.bind(this),
      onError: this.handleError.bind(this)
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
    
    logger.log('Connecting to:', this.name)
    this.peerManager.connect()
    this.peerManager.subscribe(this.name)
  }

  /**
   * Disconnect from the topic and clean up event listeners
   */
  disconnect(): void {
    if (this._destroyed) return
    
    logger.log('Disconnecting from:', this.name)
    this._destroyed = true
    
    // Unsubscribe from the topic
    this.peerManager.unsubscribe(this.name)
    this.topicPeers.clear()
    
    // Remove all event listeners from PeerManager to prevent memory leaks
    // and potential data routing issues during rapid reconnects
    this.peerManager.off('signaling:connect', this.boundHandlers.onSignalingConnect)
    this.peerManager.off('signaling:disconnect', this.boundHandlers.onSignalingDisconnect)
    this.peerManager.off('signaling:message', this.boundHandlers.onSignalingMessage)
    this.peerManager.off('welcome', this.boundHandlers.onWelcome)
    this.peerManager.off('identity', this.boundHandlers.onIdentity)
    this.peerManager.off('peer:identity', this.boundHandlers.onPeerIdentity)
    this.peerManager.off('channel:open', this.boundHandlers.onChannelOpen)
    this.peerManager.off('channel:close', this.boundHandlers.onChannelClose)
    this.peerManager.off('channel:data', this.boundHandlers.onChannelData)
    this.peerManager.off('error', this.boundHandlers.onError)
    
    // Clear our own listeners
    this.removeAllListeners()
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
    // Use bound handlers so they can be removed on disconnect
    this.peerManager.on('signaling:connect', this.boundHandlers.onSignalingConnect)
    this.peerManager.on('signaling:disconnect', this.boundHandlers.onSignalingDisconnect)
    this.peerManager.on('signaling:message', this.boundHandlers.onSignalingMessage)
    this.peerManager.on('welcome', this.boundHandlers.onWelcome)
    this.peerManager.on('identity', this.boundHandlers.onIdentity)
    this.peerManager.on('peer:identity', this.boundHandlers.onPeerIdentity)
    this.peerManager.on('channel:open', this.boundHandlers.onChannelOpen)
    this.peerManager.on('channel:close', this.boundHandlers.onChannelClose)
    this.peerManager.on('channel:data', this.boundHandlers.onChannelData)
    this.peerManager.on('error', this.boundHandlers.onError)
  }
  
  // ============================================================================
  // Private: Event Handlers
  // ============================================================================
  
  private handleSignalingConnect(): void {
    if (this._destroyed) return
    this.emit('signaling:connect')
  }
  
  private handleSignalingDisconnect(): void {
    if (this._destroyed) return
    this.emit('signaling:disconnect')
  }
  
  private handleSignalingMessage(message: SignalingMessage): void {
    if (this._destroyed) return
    this.emit('signaling:message', message)
  }
  
  private handleWelcome(identity: string, kind: PeerKind): void {
    if (this._destroyed) return
    this.emit('welcome', identity, kind)
  }
  
  private handleIdentity(identity: string): void {
    if (this._destroyed) return
    if (!this._synced) {
      this._synced = true
      this.emit('synced', identity)
    }
  }
  
  private handlePeerIdentity(peerId: string, identity: string, kind: PeerKind): void {
    if (this._destroyed) return
    const peer = this.topicPeers.get(peerId)
    if (peer) {
      peer.identity = identity
      peer.kind = kind
    }
    this.emit('peer:identity', peerId, identity, kind)
  }
  
  private handleChannelOpen(topic: string, peerId: string): void {
    if (this._destroyed) return
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
  }
  
  private handleChannelClose(topic: string, peerId: string): void {
    if (this._destroyed) return
    if (topic !== this.name) return
    
    this.topicPeers.delete(peerId)
    this.emit('peers', this.topicPeers)
  }
  
  private handleChannelData(topic: string, peerId: string, data: Uint8Array): void {
    if (this._destroyed) return
    if (topic !== this.name) return
    
    const identityInfo = this.peerManager.getPeerIdentity(peerId)
    const identity = identityInfo?.identity
    
    // Apply message filter
    if (this.filterMessage && !this.filterMessage(peerId, identity, data)) {
      return
    }
    
    this.emit('data', data, peerId, identity)
  }
  
  private handleError(error: Error): void {
    if (this._destroyed) return
    this.emit('error', error)
  }
}


export default Topic
