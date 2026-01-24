/**
 * SignalingClient - WebSocket client for WebRTC signaling
 * 
 * Connects to the signaling server and handles:
 * - Room subscription/unsubscription
 * - Publishing and receiving signaling messages
 * - Ping/pong keepalive
 * - Automatic reconnection
 */

import { EventEmitter } from './EventEmitter'
import type { SignalData } from './WebRTCPeer'

// ============================================================================
// Types
// ============================================================================

export interface SignalingMessage {
  type: 'publish' | 'subscribe' | 'unsubscribe' | 'ping' | 'pong'
  topic?: string
  topics?: string[]
  data?: MessageData
  identity?: string
  kind?: 'client' | 'worker'
}

export interface MessageData {
  type: 'announce' | 'signal'
  from: string
  to?: string
  signal?: SignalData
}

export interface SignalingClientOptions {
  /** Signaling server URL */
  url: string
  /** Reconnection delay in ms */
  reconnectDelay?: number
  /** Maximum reconnection attempts */
  maxReconnectAttempts?: number
  /** Ping interval in ms */
  pingInterval?: number
}

export type PeerKind = 'client' | 'worker'

export type SignalingClientEvents = {
  /** Connected to signaling server */
  connect: () => void
  /** Disconnected from signaling server */
  disconnect: () => void
  /** Received a message */
  message: (message: SignalingMessage) => void
  /** Received an announce from a peer */
  announce: (roomName: string, peerId: string, identity: string | undefined, kind: PeerKind | undefined) => void
  /** Received a signal from a peer */
  signal: (roomName: string, from: string, to: string, signal: SignalData, identity: string | undefined, kind: PeerKind | undefined) => void
  /** Error occurred */
  error: (error: Error) => void
}

// ============================================================================
// SignalingClient
// ============================================================================

export class SignalingClient extends EventEmitter<SignalingClientEvents> {
  private ws: WebSocket | null = null
  private readonly url: string
  private readonly reconnectDelay: number
  private readonly maxReconnectAttempts: number
  private readonly pingInterval: number
  
  private reconnectAttempts = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private subscribedRooms = new Set<string>()
  private destroyed = false

  constructor(options: SignalingClientOptions) {
    super()
    
    this.url = options.url
    this.reconnectDelay = options.reconnectDelay ?? 1000
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 10
    this.pingInterval = options.pingInterval ?? 25_000
  }

  /**
   * Connect to the signaling server
   */
  connect(): void {
    if (this.destroyed) {
      console.debug('[SignalingClient] Cannot connect - destroyed')
      return
    }
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.debug('[SignalingClient] Already connected')
      return
    }
    
    console.debug('[SignalingClient] Connecting to', this.url)
    
    try {
      this.ws = new WebSocket(this.url)
      this.setupWebSocket()
    } catch (err) {
      console.error('[SignalingClient] Connection error:', err)
      this.emit('error', err as Error)
      this.scheduleReconnect()
    }
  }

  /**
   * Disconnect from the signaling server
   */
  disconnect(): void {
    this.destroyed = true
    this.cleanup()
    
    if (this.ws) {
      try {
        this.ws.close(1000, 'Client disconnect')
      } catch {}
      this.ws = null
    }
  }

  /**
   * Subscribe to a room
   */
  subscribe(roomName: string): void {
    this.subscribedRooms.add(roomName)
    
    if (this.isConnected) {
      this.send({
        type: 'subscribe',
        topics: [roomName]
      })
    }
  }

  /**
   * Unsubscribe from a room
   */
  unsubscribe(roomName: string): void {
    this.subscribedRooms.delete(roomName)
    
    if (this.isConnected) {
      this.send({
        type: 'unsubscribe',
        topics: [roomName]
      })
    }
  }

  /**
   * Announce presence in a room
   */
  announce(roomName: string, peerId: string): void {
    this.send({
      type: 'publish',
      topic: roomName,
      data: {
        type: 'announce',
        from: peerId
      }
    })
  }

  /**
   * Send a signal to a specific peer
   */
  sendSignal(roomName: string, from: string, to: string, signal: SignalData): void {
    this.send({
      type: 'publish',
      topic: roomName,
      data: {
        type: 'signal',
        from,
        to,
        signal
      }
    })
  }

  /**
   * Check if connected to the signaling server
   */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  // ============================================================================
  // Private methods
  // ============================================================================

  private setupWebSocket(): void {
    if (!this.ws) return
    
    this.ws.onopen = () => {
      console.debug('[SignalingClient] Connected to', this.url)
      this.reconnectAttempts = 0
      this.startPingInterval()
      
      // Resubscribe to rooms
      if (this.subscribedRooms.size > 0) {
        console.debug('[SignalingClient] Resubscribing to rooms:', Array.from(this.subscribedRooms))
        this.send({
          type: 'subscribe',
          topics: Array.from(this.subscribedRooms)
        })
      }
      
      this.emit('connect')
    }
    
    this.ws.onclose = (event) => {
      console.debug('[SignalingClient] Disconnected from', this.url, 'code:', event.code, 'reason:', event.reason)
      this.cleanup()
      this.emit('disconnect')
      
      if (!this.destroyed) {
        this.scheduleReconnect()
      }
    }
    
    this.ws.onerror = (event) => {
      console.error('[SignalingClient] WebSocket error:', event)
      this.emit('error', new Error('WebSocket error'))
    }
    
    this.ws.onmessage = (event) => {
      this.handleMessage(event.data)
    }
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data) as SignalingMessage
      
      // Emit raw message
      this.emit('message', message)
      
      // Handle specific message types
      if (message.type === 'publish' && message.data && message.topic) {
        if (message.data.type === 'announce') {
          this.emit('announce', message.topic, message.data.from, message.identity, message.kind)
        } else if (message.data.type === 'signal' && message.data.to && message.data.signal) {
          this.emit('signal', message.topic, message.data.from, message.data.to, message.data.signal, message.identity, message.kind)
        }
      }
    } catch (err) {
      console.warn('[SignalingClient] Failed to parse message:', err)
    }
  }

  private send(message: SignalingMessage): void {
    if (!this.isConnected) return
    
    try {
      this.ws!.send(JSON.stringify(message))
    } catch (err) {
      console.warn('[SignalingClient] Send error:', err)
    }
  }

  private startPingInterval(): void {
    this.stopPingInterval()
    
    this.pingTimer = setInterval(() => {
      if (this.isConnected) {
        this.send({ type: 'ping' })
      }
    }, this.pingInterval)
  }

  private stopPingInterval(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }

  private scheduleReconnect(): void {
    if (this.destroyed) return
    if (this.reconnectTimer) return
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('error', new Error('Max reconnection attempts reached'))
      return
    }
    
    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, Math.min(delay, 30000))
  }

  private cleanup(): void {
    this.stopPingInterval()
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }
}
