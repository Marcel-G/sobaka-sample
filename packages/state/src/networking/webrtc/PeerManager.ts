/**
 * PeerManager - Singleton managing all WebRTC peer connections
 * 
 * This module optimizes WebRTC connections by:
 * - Reusing existing RTCPeerConnection instances when connecting to the same peer
 * - Creating multiple data channels (one per topic) on a single connection
 * - Centralizing signaling and connection lifecycle management
 * 
 * Architecture:
 * - One RTCPeerConnection per unique remote peer ID
 * - Multiple data channels per connection (one per topic/room)
 * - Channel name = topic name for message routing
 */

import { EventEmitter } from './EventEmitter'
import { SignalingClient, type SignalingMessage, type PeerKind } from './SignalingClient'
import { createLogger } from '../../util/logger'
import { encodePacket, decodePacket, type DecodedPacket } from './chunking'

const logger = createLogger('PeerManager')

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:global.stun.twilio.com:3478'] }
]

const ICE_GATHERING_TIMEOUT = 5_000
const CHANNEL_CLOSING_TIMEOUT = 5_000
const CHUNK_SIZE = 16 * 1024 - 512 // 16KB minus header space (matches WebRTCPeer)
const MAX_BUFFERED_AMOUNT = 64 * 1024
const TX_CLEANUP_DELAY = 30_000 // 30 seconds

// ============================================================================
// Types
// ============================================================================

export interface PeerManagerOptions {
  /** Signaling server URL(s) */
  signaling: string[]
  /** ICE servers for WebRTC */
  iceServers?: RTCIceServer[]
}

export interface TopicChannel {
  channel: RTCDataChannel
  topic: string
  peerId: string
}

export interface PeerInfo {
  peerId: string
  identity?: string
  kind?: PeerKind
  connection: RTCPeerConnection
  channels: Map<string, RTCDataChannel>  // topic -> channel
  connected: boolean
  glareToken?: number
  // Chunking state
  txOrdinal: number
  // Per-topic packet storage to prevent cross-topic mixing
  // Key is "topic:txOrd" to isolate packets from different topics
  rxPackets: Map<string, DecodedPacket[]>
}

export type PeerManagerEvents = {
  /** Connected to signaling server */
  'signaling:connect': () => void
  /** Disconnected from signaling server */
  'signaling:disconnect': () => void
  /** Raw signaling message received */
  'signaling:message': (message: SignalingMessage) => void
  /** Welcome message with our identity and role */
  'welcome': (identity: string, kind: PeerKind) => void
  /** Our identity verified by signaling server */
  'identity': (identity: string) => void
  /** Peer identity verified */
  'peer:identity': (peerId: string, identity: string, kind: PeerKind) => void
  /** Peer connection established */
  'peer:connect': (peerId: string) => void
  /** Peer connection closed */
  'peer:disconnect': (peerId: string) => void
  /** Topic channel opened */
  'channel:open': (topic: string, peerId: string) => void
  /** Topic channel closed */
  'channel:close': (topic: string, peerId: string) => void
  /** Data received on a topic channel */
  'channel:data': (topic: string, peerId: string, data: Uint8Array) => void
  /** Error occurred */
  'error': (error: Error) => void
}

// ============================================================================
// PeerManager
// ============================================================================

export class PeerManager extends EventEmitter<PeerManagerEvents> {
  private static instance: PeerManager | null = null
  
  readonly peerId: string
  private readonly iceServers: RTCIceServer[]
  private readonly signalingClients: SignalingClient[] = []
  private readonly peers = new Map<string, PeerInfo>()
  private readonly subscribedTopics = new Set<string>()
  private readonly peerIdentities = new Map<string, { identity: string; kind: PeerKind }>()
  
  private myIdentity: string | null = null
  private destroyed = false

  private constructor(options: PeerManagerOptions) {
    super()
    
    this.peerId = crypto.randomUUID()
    this.iceServers = options.iceServers ?? DEFAULT_ICE_SERVERS
    
    // Create signaling clients
    for (const url of options.signaling) {
      const client = new SignalingClient({ url })
      this.setupSignalingClient(client)
      this.signalingClients.push(client)
    }
    
    logger.log('Created with peerId:', this.peerId)
  }

  /**
   * Get or create the PeerManager singleton
   */
  static getInstance(options?: PeerManagerOptions): PeerManager {
    if (!PeerManager.instance) {
      if (!options) {
        throw new Error('PeerManager requires options on first initialization')
      }
      PeerManager.instance = new PeerManager(options)
    }
    return PeerManager.instance
  }

  /**
   * Reset the singleton (for testing)
   */
  static reset(): void {
    if (PeerManager.instance) {
      PeerManager.instance.destroy()
      PeerManager.instance = null
    }
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Connect to signaling servers
   */
  connect(): void {
    if (this.destroyed) return
    
    for (const client of this.signalingClients) {
      client.connect()
    }
  }

  /**
   * Subscribe to a topic and announce presence
   */
  subscribe(topic: string): void {
    if (this.destroyed) return
    if (this.subscribedTopics.has(topic)) return
    
    logger.log('Subscribing to topic:', topic)
    this.subscribedTopics.add(topic)
    
    for (const client of this.signalingClients) {
      if (client.isConnected) {
        client.subscribe(topic)
        client.announce(topic, this.peerId)
      }
    }
  }

  /**
   * Unsubscribe from a topic
   */
  unsubscribe(topic: string): void {
    if (!this.subscribedTopics.has(topic)) return
    
    logger.log('Unsubscribing from topic:', topic)
    this.subscribedTopics.delete(topic)
    
    // Close all channels for this topic
    for (const peer of this.peers.values()) {
      const channel = peer.channels.get(topic)
      if (channel) {
        try { channel.close() } catch {}
        peer.channels.delete(topic)
      }
    }
    
    for (const client of this.signalingClients) {
      if (client.isConnected) {
        client.unsubscribe(topic)
      }
    }
  }

  /**
   * Send data to all peers on a topic
   */
  broadcast(topic: string, data: Uint8Array): void {
    for (const peer of this.peers.values()) {
      this.sendTo(topic, peer.peerId, data)
    }
  }

  /**
   * Send data to a specific peer on a topic
   */
  sendTo(topic: string, peerId: string, data: Uint8Array): boolean {
    const peer = this.peers.get(peerId)
    if (!peer) return false
    
    const channel = peer.channels.get(topic)
    if (!channel || channel.readyState !== 'open') return false
    
    try {
      // Chunk the data with proper headers
      const packets = this.chunkData(peer, data)
      for (const packet of packets) {
        channel.send(packet as unknown as ArrayBuffer)
      }
      return true
    } catch (err) {
      logger.warn('Failed to send to', peerId, 'on topic', topic, err)
      return false
    }
  }

  /**
   * Chunk data into packets with headers for transmission
   */
  private chunkData(peer: PeerInfo, data: Uint8Array): Uint8Array[] {
    const txOrd = peer.txOrdinal++
    const totalSize = data.length
    const chunks: Uint8Array[] = []
    
    let offset = 0
    while (offset < totalSize) {
      const chunkData = data.slice(offset, offset + CHUNK_SIZE)
      chunks.push(chunkData)
      offset += CHUNK_SIZE
    }
    
    // Handle empty data case
    if (chunks.length === 0) {
      chunks.push(new Uint8Array(0))
    }
    
    // Encode each chunk with metadata
    return chunks.map((chunk, index) => 
      encodePacket({
        chunk,
        txOrd,
        index,
        length: chunks.length,
        totalSize,
        chunkSize: chunk.byteLength
      })
    )
  }

  /**
   * Handle incoming packet: decode and reassemble multi-chunk messages
   * 
   * IMPORTANT: Topic is required to prevent cross-topic packet mixing.
   * Since multiple topics share the same peer connection, packets from
   * different topics could have the same txOrd value.
   */
  private handleIncomingPacket(peer: PeerInfo, topic: string, rawData: Uint8Array): Uint8Array | null {
    const packet = decodePacket(rawData)
    
    // Single-chunk message - deliver immediately
    if (packet.chunkSize === packet.totalSize) {
      return packet.chunk
    }
    
    // Use topic+txOrd as key to isolate packets from different topics
    const key = `${topic}:${packet.txOrd}`
    
    // Multi-chunk message - collect and reassemble
    let existingPackets = peer.rxPackets.get(key)
    if (!existingPackets) {
      existingPackets = []
      peer.rxPackets.set(key, existingPackets)
    }
    existingPackets.push(packet)
    
    const receivedIndices = new Set(existingPackets.map(p => p.index))
    
    // Check if we have all chunks
    if (receivedIndices.size === packet.length) {
      // Sort by index and reassemble
      existingPackets.sort((a, b) => a.index - b.index)
      
      const reassembled = new Uint8Array(packet.totalSize)
      let offset = 0
      for (const p of existingPackets) {
        reassembled.set(p.chunk, offset)
        offset += p.chunk.length
      }
      
      // Clean up after delay
      setTimeout(() => {
        peer.rxPackets.delete(key)
      }, TX_CLEANUP_DELAY)
      
      return reassembled
    } else {
      return null
    }
  }

  /**
   * Get connected peers for a topic
   */
  getTopicPeers(topic: string): string[] {
    const peers: string[] = []
    for (const peer of this.peers.values()) {
      if (peer.connected && peer.channels.has(topic)) {
        peers.push(peer.peerId)
      }
    }
    return peers
  }

  /**
   * Get peer identity
   */
  getPeerIdentity(peerId: string): { identity: string; kind: PeerKind } | undefined {
    return this.peerIdentities.get(peerId)
  }

  /**
   * Get our verified identity
   */
  get identity(): string | null {
    return this.myIdentity
  }

  /**
   * Check if connected to signaling
   */
  get isConnected(): boolean {
    return this.signalingClients.some(c => c.isConnected)
  }

  /**
   * Destroy the PeerManager
   */
  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    
    // Close all peer connections
    for (const peer of this.peers.values()) {
      try { peer.connection.close() } catch {}
    }
    this.peers.clear()
    
    // Disconnect signaling
    for (const client of this.signalingClients) {
      client.disconnect()
    }
    
    this.removeAllListeners()
  }

  // ============================================================================
  // Private: Signaling
  // ============================================================================

  private setupSignalingClient(client: SignalingClient): void {
    client.on('connect', () => {
      logger.log('Signaling connected')
      this.emit('signaling:connect')
      
      // Resubscribe to all topics
      for (const topic of this.subscribedTopics) {
        client.subscribe(topic)
        client.announce(topic, this.peerId)
      }
    })
    
    client.on('disconnect', () => {
      logger.log('Signaling disconnected')
      this.emit('signaling:disconnect')
    })
    
    client.on('welcome', (identity, kind) => {
      logger.log('Received welcome:', identity, kind)
      this.emit('welcome', identity, kind)
      // Also emit identity for backwards compat
      this.emit('identity', identity)
    })
    
    client.on('announce', (topic, remotePeerId, identity, kind) => {
      if (remotePeerId === this.peerId) return
      if (!this.subscribedTopics.has(topic)) return
      
      // Store identity
      if (identity && kind) {
        this.peerIdentities.set(remotePeerId, { identity, kind })
        this.emit('peer:identity', remotePeerId, identity, kind)
      }
      
      this.handlePeerAnnounce(topic, remotePeerId)
    })
    
    client.on('signal', (topic, from, to, signal, identity, kind) => {
      if (to !== this.peerId) return
      
      // Store identity
      if (identity && kind) {
        this.peerIdentities.set(from, { identity, kind })
        this.emit('peer:identity', from, identity, kind)
      }
      
      this.handleSignal(topic, from, signal)
    })
    
    client.on('message', (message) => {
      this.emit('signaling:message', message)
      
      // Detect our own identity
      if (!this.myIdentity && message.type === 'publish' && message.identity) {
        if (message.data?.from === this.peerId) {
          this.myIdentity = message.identity
          logger.log('Identity verified:', this.myIdentity)
          this.emit('identity', this.myIdentity)
        }
      }
    })
    
    client.on('error', (err) => {
      this.emit('error', err)
    })
  }

  // ============================================================================
  // Private: Peer Connection Management
  // ============================================================================

  private handlePeerAnnounce(topic: string, remotePeerId: string): void {
    // Determine who initiates (higher peer ID initiates)
    const shouldInitiate = this.peerId > remotePeerId
    
    let peer = this.peers.get(remotePeerId)
    
    if (!peer) {
      // Create new peer connection
      peer = this.createPeerConnection(remotePeerId, shouldInitiate)
    }
    
    // Ensure we have a channel for this topic
    if (!peer.channels.has(topic)) {
      if (shouldInitiate) {
        this.createDataChannel(peer, topic)
      }
      // If not initiator, we'll receive the channel via ondatachannel
    }
  }

  private handleSignal(topic: string, from: string, signal: { type?: string; sdp?: string; candidate?: string | RTCIceCandidateInit; token?: number; sdpMLineIndex?: number | null; sdpMid?: string | null }): void {
    let peer = this.peers.get(from)
    
    if ('type' in signal) {
      if (signal.type === 'offer') {
        // Handle glare (both peers trying to connect simultaneously)
        if (peer?.glareToken) {
          const remoteToken = (signal as { token?: number }).token ?? 0
          if (peer.glareToken > remoteToken) {
            logger.log('Rejecting offer due to glare')
            return
          }
          peer.glareToken = undefined
        }
        
        if (!peer) {
          peer = this.createPeerConnection(from, false)
        }
        
        this.handleOffer(peer, topic, signal as RTCSessionDescriptionInit)
      } else if (signal.type === 'answer') {
        if (peer) {
          peer.glareToken = undefined
          this.handleAnswer(peer, signal as RTCSessionDescriptionInit)
        }
      } else if (signal.type === 'renegotiate') {
        // Handle renegotiation request
        if (peer) {
          this.createOffer(peer, topic)
        }
      }
    } else if (signal.type === 'candidate' || 'candidate' in signal) {
      if (peer) {
        // Handle candidate - could be nested or flat format
        const candidateInit: RTCIceCandidateInit = typeof signal.candidate === 'object' 
          ? signal.candidate as RTCIceCandidateInit
          : {
              candidate: signal.candidate as string,
              sdpMLineIndex: signal.sdpMLineIndex ?? null,
              sdpMid: signal.sdpMid ?? null
            }
        this.handleCandidate(peer, candidateInit)
      }
    }
  }

  private createPeerConnection(remotePeerId: string, initiator: boolean): PeerInfo {
    logger.log('Creating peer connection to', remotePeerId, 'initiator:', initiator)
    
    const connection = new RTCPeerConnection({
      iceServers: this.iceServers,
      // @ts-expect-error - sdpSemantics is deprecated but useful
      sdpSemantics: 'unified-plan'
    })
    
    const peer: PeerInfo = {
      peerId: remotePeerId,
      connection,
      channels: new Map(),
      connected: false,
      txOrdinal: 0,
      rxPackets: new Map()
    }
    
    this.peers.set(remotePeerId, peer)
    this.setupPeerConnection(peer)
    
    return peer
  }

  private setupPeerConnection(peer: PeerInfo): void {
    const { connection, peerId } = peer
    
    connection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal(peerId, {
          type: 'candidate',
          candidate: event.candidate.candidate,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
          sdpMid: event.candidate.sdpMid
        })
      }
    }
    
    connection.oniceconnectionstatechange = () => {
      const state = connection.iceConnectionState
      logger.log('ICE state for', peerId, ':', state)
      
      if (state === 'connected' || state === 'completed') {
        if (!peer.connected) {
          peer.connected = true
          this.emit('peer:connect', peerId)
        }
      } else if (state === 'failed' || state === 'closed' || state === 'disconnected') {
        this.handlePeerDisconnect(peerId)
      }
    }
    
    connection.ondatachannel = (event) => {
      const channel = event.channel
      const topic = channel.label
      logger.log('Received data channel for topic:', topic, 'from', peerId)
      this.setupDataChannel(peer, topic, channel)
    }
  }

  private createDataChannel(peer: PeerInfo, topic: string): RTCDataChannel {
    logger.log('Creating data channel for topic:', topic, 'to', peer.peerId)
    
    const channel = peer.connection.createDataChannel(topic, { ordered: true })
    this.setupDataChannel(peer, topic, channel)
    
    // Create offer after adding channel
    this.createOffer(peer, topic)
    
    return channel
  }

  private setupDataChannel(peer: PeerInfo, topic: string, channel: RTCDataChannel): void {
    channel.binaryType = 'arraybuffer'
    
    peer.channels.set(topic, channel)
    
    channel.onopen = () => {
      logger.log('Channel opened for topic:', topic, 'to', peer.peerId)
      this.emit('channel:open', topic, peer.peerId)
    }
    
    channel.onclose = () => {
      logger.log('Channel closed for topic:', topic, 'to', peer.peerId)
      peer.channels.delete(topic)
      this.emit('channel:close', topic, peer.peerId)
    }
    
    channel.onmessage = (event) => {
      const rawData = new Uint8Array(event.data)
      // Pass topic to prevent cross-topic packet mixing
      const reassembled = this.handleIncomingPacket(peer, topic, rawData)
      if (reassembled) {
        this.emit('channel:data', topic, peer.peerId, reassembled)
      }
    }
    
    channel.onerror = (event) => {
      logger.error('Channel error on topic:', topic, event)
    }
  }

  private handlePeerDisconnect(peerId: string): void {
    const peer = this.peers.get(peerId)
    if (!peer) return
    
    logger.log('Peer disconnected:', peerId)
    
    // Close all channels
    for (const [topic, channel] of peer.channels) {
      try { channel.close() } catch {}
      this.emit('channel:close', topic, peerId)
    }
    
    try { peer.connection.close() } catch {}
    
    this.peers.delete(peerId)
    this.emit('peer:disconnect', peerId)
  }

  // ============================================================================
  // Private: Signaling Helpers
  // ============================================================================

  private async createOffer(peer: PeerInfo, topic: string): Promise<void> {
    try {
      const offer = await peer.connection.createOffer()
      await peer.connection.setLocalDescription(offer)
      
      peer.glareToken = Date.now() + Math.random()
      
      this.sendSignal(peer.peerId, {
        type: 'offer',
        sdp: offer.sdp,
        token: peer.glareToken
      }, topic)
    } catch (err) {
      logger.error('Failed to create offer:', err)
    }
  }

  private async handleOffer(peer: PeerInfo, topic: string, offer: RTCSessionDescriptionInit): Promise<void> {
    try {
      await peer.connection.setRemoteDescription(offer)
      const answer = await peer.connection.createAnswer()
      await peer.connection.setLocalDescription(answer)
      
      this.sendSignal(peer.peerId, {
        type: 'answer',
        sdp: answer.sdp
      }, topic)
    } catch (err) {
      logger.error('Failed to handle offer:', err)
    }
  }

  private async handleAnswer(peer: PeerInfo, answer: RTCSessionDescriptionInit): Promise<void> {
    try {
      await peer.connection.setRemoteDescription(answer)
    } catch (err) {
      logger.error('Failed to handle answer:', err)
    }
  }

  private handleCandidate(peer: PeerInfo, candidate: RTCIceCandidateInit): void {
    peer.connection.addIceCandidate(new RTCIceCandidate(candidate))
      .catch((err) => {
        if (!candidate.candidate?.includes('.local')) {
          logger.error('Failed to add ICE candidate:', err)
        }
      })
  }

  private sendSignal(to: string, signal: object, topic?: string): void {
    // Use first subscribed topic if not specified
    const signalTopic = topic ?? this.subscribedTopics.values().next().value
    if (!signalTopic) return
    
    for (const client of this.signalingClients) {
      if (client.isConnected) {
        client.sendSignal(signalTopic, this.peerId, to, signal as any)
        break
      }
    }
  }
}

export default PeerManager
