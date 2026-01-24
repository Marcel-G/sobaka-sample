/**
 * WebRTCPeer - A clean WebRTC peer connection wrapper
 * 
 * Replaces simple-peer with a TypeScript implementation that:
 * - Creates and manages RTCPeerConnection
 * - Handles ICE candidate exchange
 * - Manages data channels for binary/text communication
 * - Emits events for signaling, connection, data, and errors
 * - Supports automatic message chunking for large payloads
 */

import { EventEmitter } from './EventEmitter'
import { encodePacket, decodePacket, type DecodedPacket } from './chunking'

// Configuration constants
const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' }
]

const CHANNEL_NAME = 'sobaka-data'
const CHUNK_SIZE = 16 * 1024 - 512 // 16KB minus header space
const MAX_BUFFERED_AMOUNT = 64 * 1024
const TX_CLEANUP_DELAY = 30_000 // 30 seconds

export interface WebRTCPeerOptions {
  /** Set to true if this peer initiates the connection */
  initiator?: boolean
  /** Custom ICE server configuration */
  iceServers?: RTCIceServer[]
  /** Disable trickle ICE (wait for all candidates before signaling) */
  trickle?: boolean
  /** Data channel configuration */
  channelConfig?: RTCDataChannelInit
}

export interface SignalData {
  type: 'offer' | 'answer' | 'candidate' | 'renegotiate'
  sdp?: string
  candidate?: RTCIceCandidateInit
}

export type WebRTCPeerEvents = {
  /** Emitted when signaling data needs to be sent to the remote peer */
  signal: (data: SignalData) => void
  /** Emitted when the connection is established and ready for data */
  connect: () => void
  /** Emitted when data is received from the remote peer */
  data: (data: Uint8Array) => void
  /** Emitted when the connection is closed */
  close: () => void
  /** Emitted on error */
  error: (error: Error) => void
}

export class WebRTCPeer extends EventEmitter<WebRTCPeerEvents> {
  private pc: RTCPeerConnection
  private channel: RTCDataChannel | null = null
  private readonly initiator: boolean
  private readonly trickle: boolean
  private readonly channelConfig: RTCDataChannelInit
  
  private connected = false
  private destroyed = false
  private pendingCandidates: RTCIceCandidateInit[] = []
  
  // Chunking state
  private txOrdinal = 0
  private rxPackets: DecodedPacket[] = []
  private messageQueue: Uint8Array[] = []
  private sending = false

  constructor(options: WebRTCPeerOptions = {}) {
    super()
    
    this.initiator = options.initiator ?? false
    this.trickle = options.trickle ?? true
    this.channelConfig = options.channelConfig ?? { ordered: true }
    
    // Create RTCPeerConnection
    this.pc = new RTCPeerConnection({
      iceServers: options.iceServers ?? DEFAULT_ICE_SERVERS
    })
    
    this.setupPeerConnection()
    
    // If initiator, create the data channel and start the offer
    if (this.initiator) {
      this.createDataChannel()
      this.negotiate()
    }
  }

  /**
   * Process signaling data from the remote peer
   */
  signal(data: SignalData): void {
    if (this.destroyed) return
    
    try {
      if (data.type === 'offer') {
        this.handleOffer(data.sdp!)
      } else if (data.type === 'answer') {
        this.handleAnswer(data.sdp!)
      } else if (data.type === 'candidate') {
        this.handleCandidate(data.candidate!)
      } else if (data.type === 'renegotiate') {
        this.negotiate()
      }
    } catch (err) {
      this.emitError(err as Error, 'ERR_SIGNALING')
    }
  }

  /**
   * Send data to the remote peer
   * Automatically chunks large messages
   */
  send(data: Uint8Array | ArrayBuffer | string): void {
    if (this.destroyed) {
      throw new Error('Cannot send on destroyed peer')
    }
    
    if (!this.connected || !this.channel || this.channel.readyState !== 'open') {
      throw new Error('Data channel is not open')
    }
    
    // Convert to Uint8Array
    let bytes: Uint8Array
    if (typeof data === 'string') {
      bytes = new TextEncoder().encode(data)
    } else if (data instanceof ArrayBuffer) {
      bytes = new Uint8Array(data)
    } else {
      bytes = data
    }
    
    // Chunk the data
    const packets = this.chunkData(bytes)
    this.messageQueue.push(...packets)
    
    // Start sending if not already
    if (!this.sending) {
      this.processMessageQueue()
    }
  }

  /**
   * Destroy the peer connection
   */
  destroy(error?: Error): void {
    if (this.destroyed) return
    this.destroyed = true
    
    if (error) {
      this.emit('error', error)
    }
    
    // Close data channel
    if (this.channel) {
      try {
        this.channel.close()
      } catch {}
      this.channel = null
    }
    
    // Close peer connection
    try {
      this.pc.close()
    } catch {}
    
    this.connected = false
    this.messageQueue = []
    this.rxPackets = []
    
    this.emit('close')
    this.removeAllListeners()
  }

  /**
   * Check if the peer is connected
   */
  get isConnected(): boolean {
    return this.connected && !this.destroyed
  }

  /**
   * Get the underlying RTCPeerConnection (for advanced use)
   */
  get peerConnection(): RTCPeerConnection {
    return this.pc
  }

  // ============================================================================
  // Private methods
  // ============================================================================

  private setupPeerConnection(): void {
    // Handle ICE candidates
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        if (this.trickle) {
          this.emit('signal', {
            type: 'candidate',
            candidate: event.candidate.toJSON()
          })
        }
      } else {
        // ICE gathering complete
        if (!this.trickle && this.pc.localDescription) {
          this.emit('signal', {
            type: this.pc.localDescription.type as 'offer' | 'answer',
            sdp: this.pc.localDescription.sdp
          })
        }
      }
    }

    // Handle ICE connection state changes
    this.pc.oniceconnectionstatechange = () => {
      const state = this.pc.iceConnectionState
      
      if (state === 'failed' || state === 'disconnected' || state === 'closed') {
        this.destroy(new Error(`ICE connection ${state}`))
      }
    }

    // Handle connection state changes
    this.pc.onconnectionstatechange = () => {
      const state = this.pc.connectionState
      
      if (state === 'failed') {
        this.destroy(new Error('Connection failed'))
      } else if (state === 'closed') {
        this.destroy()
      }
    }

    // Handle incoming data channel (for non-initiator)
    this.pc.ondatachannel = (event) => {
      this.channel = event.channel
      this.setupDataChannel()
    }
  }

  private createDataChannel(): void {
    this.channel = this.pc.createDataChannel(CHANNEL_NAME, this.channelConfig)
    this.setupDataChannel()
  }

  private setupDataChannel(): void {
    if (!this.channel) return
    
    this.channel.binaryType = 'arraybuffer'
    
    this.channel.onopen = () => {
      this.connected = true
      this.emit('connect')
    }
    
    this.channel.onclose = () => {
      if (!this.destroyed) {
        this.destroy()
      }
    }
    
    this.channel.onerror = (event) => {
      const error = (event as RTCErrorEvent).error ?? new Error('Data channel error')
      this.emitError(error, 'ERR_DATA_CHANNEL')
    }
    
    this.channel.onmessage = (event) => {
      this.handleChannelMessage(event)
    }
    
    // Set up bufferedamountlow handling for flow control
    this.channel.bufferedAmountLowThreshold = MAX_BUFFERED_AMOUNT / 2
  }

  private async negotiate(): Promise<void> {
    try {
      const offer = await this.pc.createOffer()
      await this.pc.setLocalDescription(offer)
      
      if (this.trickle && this.pc.localDescription) {
        this.emit('signal', {
          type: 'offer',
          sdp: this.pc.localDescription.sdp
        })
      }
    } catch (err) {
      this.emitError(err as Error, 'ERR_CREATE_OFFER')
    }
  }

  private async handleOffer(sdp: string): Promise<void> {
    try {
      await this.pc.setRemoteDescription({ type: 'offer', sdp })
      
      // Add any pending candidates
      for (const candidate of this.pendingCandidates) {
        await this.pc.addIceCandidate(candidate)
      }
      this.pendingCandidates = []
      
      const answer = await this.pc.createAnswer()
      await this.pc.setLocalDescription(answer)
      
      if (this.trickle && this.pc.localDescription) {
        this.emit('signal', {
          type: 'answer',
          sdp: this.pc.localDescription.sdp
        })
      }
    } catch (err) {
      this.emitError(err as Error, 'ERR_SET_REMOTE_DESCRIPTION')
    }
  }

  private async handleAnswer(sdp: string): Promise<void> {
    try {
      await this.pc.setRemoteDescription({ type: 'answer', sdp })
      
      // Add any pending candidates
      for (const candidate of this.pendingCandidates) {
        await this.pc.addIceCandidate(candidate)
      }
      this.pendingCandidates = []
    } catch (err) {
      this.emitError(err as Error, 'ERR_SET_REMOTE_DESCRIPTION')
    }
  }

  private async handleCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    try {
      if (this.pc.remoteDescription) {
        await this.pc.addIceCandidate(candidate)
      } else {
        // Queue candidate until we have remote description
        this.pendingCandidates.push(candidate)
      }
    } catch (err) {
      this.emitError(err as Error, 'ERR_ADD_ICE_CANDIDATE')
    }
  }

  private emitError(error: Error, code?: string): void {
    if (code) {
      (error as Error & { code?: string }).code = code
    }
    this.emit('error', error)
    this.destroy(error)
  }

  // ============================================================================
  // Message chunking
  // ============================================================================

  private chunkData(data: Uint8Array): Uint8Array[] {
    const txOrd = this.txOrdinal++
    const totalSize = data.length
    const chunks: Uint8Array[] = []
    
    let offset = 0
    while (offset < totalSize) {
      const chunkData = data.slice(offset, offset + CHUNK_SIZE)
      chunks.push(chunkData)
      offset += CHUNK_SIZE
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

  private handleChannelMessage(event: MessageEvent): void {
    const data = new Uint8Array(event.data)
    const packet = decodePacket(data)
    
    // Single-chunk message - deliver immediately
    if (packet.chunkSize === packet.totalSize) {
      this.emit('data', packet.chunk)
      return
    }
    
    // Multi-chunk message - collect and reassemble
    const existingPackets = this.rxPackets.filter(p => p.txOrd === packet.txOrd)
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
      
      this.emit('data', reassembled)
      
      // Clean up after delay
      const txOrd = packet.txOrd
      setTimeout(() => {
        this.rxPackets = this.rxPackets.filter(p => p.txOrd !== txOrd)
      }, TX_CLEANUP_DELAY)
    } else {
      // Store for later
      this.rxPackets.push(packet)
    }
  }

  private processMessageQueue(): void {
    if (!this.channel || this.channel.readyState !== 'open') {
      this.sending = false
      return
    }
    
    this.sending = true
    
    while (this.messageQueue.length > 0) {
      // Check buffer
      if (this.channel.bufferedAmount > MAX_BUFFERED_AMOUNT) {
        // Wait for buffer to drain
        const onBufferedAmountLow = () => {
          this.channel?.removeEventListener('bufferedamountlow', onBufferedAmountLow)
          this.processMessageQueue()
        }
        this.channel.addEventListener('bufferedamountlow', onBufferedAmountLow)
        return
      }
      
      const message = this.messageQueue.shift()!
      try {
        this.channel.send(message)
      } catch (err) {
        console.warn('[WebRTCPeer] Send error:', err)
        break
      }
    }
    
    this.sending = false
  }
}
