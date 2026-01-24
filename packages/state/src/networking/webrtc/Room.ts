/**
 * Room - Manages WebRTC peer connections within a room
 * 
 * Handles:
 * - Peer discovery via signaling
 * - Creating and managing WebRTC connections to peers
 * - Broadcasting data to all connected peers
 * - Mesh topology (each peer connects to each other)
 */

import { EventEmitter } from './EventEmitter'
import { WebRTCPeer, type SignalData, type WebRTCPeerOptions } from './WebRTCPeer'
import { SignalingClient } from './SignalingClient'
import { uuidv4 } from 'lib0/random'

// ============================================================================
// Types
// ============================================================================

export interface PeerConnection {
  peer: WebRTCPeer
  remotePeerId: string
  connected: boolean
  identity?: string
}

export interface RoomOptions {
  /** Room name/topic */
  name: string
  /** Signaling server URL(s) */
  signaling: string[]
  /** Maximum number of peer connections */
  maxConns?: number
  /** ICE servers for WebRTC */
  iceServers?: RTCIceServer[]
  /** Custom peer options */
  peerOpts?: Partial<WebRTCPeerOptions>
  /** Filter function for incoming messages */
  filterMessage?: (peerId: string, identity: string | undefined, data: Uint8Array) => boolean
}

export type RoomEvents = {
  /** Peer list changed */
  peers: (peers: Map<string, PeerConnection>) => void
  /** Data received from a peer */
  data: (data: Uint8Array, peerId: string, identity: string | undefined) => void
  /** Room synced (initial peer discovery complete) */
  synced: () => void
  /** Error occurred */
  error: (error: Error) => void
  /** Connected to signaling */
  'signaling:connect': () => void
  /** Disconnected from signaling */
  'signaling:disconnect': () => void
  /** Identity verified for a peer */
  'peer:identity': (peerId: string, identity: string) => void
}

// ============================================================================
// Room
// ============================================================================

export class Room extends EventEmitter<RoomEvents> {
  readonly name: string
  readonly peerId: string
  
  private readonly signalingClients: SignalingClient[] = []
  private readonly peers = new Map<string, PeerConnection>()
  private readonly knownPeers = new Set<string>()
  private readonly peerIdentities = new Map<string, string>()
  
  private readonly maxConns: number
  private readonly iceServers?: RTCIceServer[]
  private readonly peerOpts: Partial<WebRTCPeerOptions>
  private readonly filterMessage: RoomOptions['filterMessage']
  
  private synced = false
  private destroyed = false
  private announceTimer: ReturnType<typeof setInterval> | null = null

  constructor(options: RoomOptions) {
    super()
    
    this.name = options.name
    this.peerId = uuidv4()
    this.maxConns = options.maxConns ?? 20 + Math.floor(Math.random() * 15)
    this.iceServers = options.iceServers
    this.peerOpts = options.peerOpts ?? {}
    this.filterMessage = options.filterMessage
    
    // Create signaling clients
    for (const url of options.signaling) {
      const client = new SignalingClient({ url })
      this.setupSignalingClient(client)
      this.signalingClients.push(client)
    }
  }

  /**
   * Connect to the room
   */
  connect(): void {
    if (this.destroyed) return
    
    for (const client of this.signalingClients) {
      client.connect()
      client.subscribe(this.name)
    }
    
    // Announce presence periodically
    this.startAnnouncing()
  }

  /**
   * Disconnect from the room
   */
  disconnect(): void {
    this.destroyed = true
    this.stopAnnouncing()
    
    // Disconnect all peers
    for (const conn of this.peers.values()) {
      conn.peer.destroy()
    }
    this.peers.clear()
    
    // Disconnect signaling
    for (const client of this.signalingClients) {
      client.unsubscribe(this.name)
      client.disconnect()
    }
    
    this.emit('peers', this.peers)
  }

  /**
   * Broadcast data to all connected peers
   */
  broadcast(data: Uint8Array): void {
    for (const conn of this.peers.values()) {
      if (conn.connected) {
        try {
          conn.peer.send(data)
        } catch (err) {
          console.warn(`[Room] Failed to send to peer ${conn.remotePeerId}:`, err)
        }
      }
    }
  }

  /**
   * Send data to a specific peer
   */
  sendTo(peerId: string, data: Uint8Array): boolean {
    const conn = this.peers.get(peerId)
    if (conn?.connected) {
      try {
        conn.peer.send(data)
        return true
      } catch (err) {
        console.warn(`[Room] Failed to send to peer ${peerId}:`, err)
      }
    }
    return false
  }

  /**
   * Get all connected peers
   */
  getConnectedPeers(): PeerConnection[] {
    return Array.from(this.peers.values()).filter(p => p.connected)
  }

  /**
   * Get the identity for a peer
   */
  getIdentity(peerId: string): string | undefined {
    return this.peerIdentities.get(peerId)
  }

  /**
   * Check if connected to at least one signaling server
   */
  get isConnected(): boolean {
    return this.signalingClients.some(c => c.isConnected)
  }

  // ============================================================================
  // Private methods
  // ============================================================================

  private setupSignalingClient(client: SignalingClient): void {
    client.on('connect', () => {
      this.emit('signaling:connect')
      this.announce()
    })
    
    client.on('disconnect', () => {
      this.emit('signaling:disconnect')
    })
    
    client.on('announce', (roomName, remotePeerId, identity) => {
      if (roomName !== this.name) return
      if (remotePeerId === this.peerId) return
      
      // Store identity
      if (identity) {
        this.peerIdentities.set(remotePeerId, identity)
        this.emit('peer:identity', remotePeerId, identity)
      }
      
      this.handleAnnounce(remotePeerId, identity)
    })
    
    client.on('signal', (roomName, from, to, signal, identity) => {
      if (roomName !== this.name) return
      if (to !== this.peerId) return
      
      // Store identity
      if (identity) {
        this.peerIdentities.set(from, identity)
        this.emit('peer:identity', from, identity)
      }
      
      this.handleSignal(from, signal, identity)
    })
    
    client.on('error', (err) => {
      this.emit('error', err)
    })
    
    client.on('message', (message) => {
      // First message with our identity confirms we're synced
      if (!this.synced && message.type === 'publish' && message.identity) {
        if (message.data?.from === this.peerId) {
          this.synced = true
          // Store our own identity
          this.peerIdentities.set(this.peerId, message.identity)
          this.emit('synced')
        }
      }
    })
  }

  private handleAnnounce(remotePeerId: string, identity?: string): void {
    if (this.peers.has(remotePeerId)) return
    if (this.peers.size >= this.maxConns) return
    
    this.knownPeers.add(remotePeerId)
    
    // Determine who initiates (higher peer ID initiates)
    const shouldInitiate = this.peerId > remotePeerId
    
    if (shouldInitiate) {
      this.createPeerConnection(remotePeerId, true, identity)
    }
    // If we shouldn't initiate, we'll create the connection when we receive a signal
  }

  private handleSignal(from: string, signal: SignalData, identity?: string): void {
    let conn = this.peers.get(from)
    
    // Create peer if this is a new connection
    if (!conn && signal.type === 'offer') {
      if (this.peers.size >= this.maxConns) return
      conn = this.createPeerConnection(from, false, identity)
    }
    
    if (conn) {
      conn.peer.signal(signal)
    }
  }

  private createPeerConnection(remotePeerId: string, initiator: boolean, identity?: string): PeerConnection {
    const peer = new WebRTCPeer({
      initiator,
      iceServers: this.iceServers,
      ...this.peerOpts
    })
    
    const conn: PeerConnection = {
      peer,
      remotePeerId,
      connected: false,
      identity
    }
    
    this.peers.set(remotePeerId, conn)
    
    // Handle signaling
    peer.on('signal', (signal) => {
      for (const client of this.signalingClients) {
        if (client.isConnected) {
          client.sendSignal(this.name, this.peerId, remotePeerId, signal)
        }
      }
    })
    
    // Handle connection
    peer.on('connect', () => {
      conn.connected = true
      this.emit('peers', this.peers)
    })
    
    // Handle data
    peer.on('data', (data) => {
      const peerIdentity = this.peerIdentities.get(remotePeerId)
      
      // Apply filter if provided
      if (this.filterMessage && !this.filterMessage(remotePeerId, peerIdentity, data)) {
        return
      }
      
      this.emit('data', data, remotePeerId, peerIdentity)
    })
    
    // Handle close
    peer.on('close', () => {
      this.peers.delete(remotePeerId)
      this.emit('peers', this.peers)
    })
    
    // Handle error
    peer.on('error', (err) => {
      console.warn(`[Room] Peer ${remotePeerId} error:`, err)
      this.peers.delete(remotePeerId)
      this.emit('peers', this.peers)
    })
    
    this.emit('peers', this.peers)
    
    return conn
  }

  private announce(): void {
    for (const client of this.signalingClients) {
      if (client.isConnected) {
        client.announce(this.name, this.peerId)
      }
    }
  }

  private startAnnouncing(): void {
    this.stopAnnouncing()
    
    // Initial announce
    this.announce()
    
    // Re-announce periodically to discover new peers
    this.announceTimer = setInterval(() => {
      this.announce()
    }, 30_000)
  }

  private stopAnnouncing(): void {
    if (this.announceTimer) {
      clearInterval(this.announceTimer)
      this.announceTimer = null
    }
  }
}
