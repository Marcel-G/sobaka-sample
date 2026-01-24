/**
 * WebRTCPeer - A modern WebRTC peer connection wrapper
 * 
 * Based on analysis of simple-peer (github.com/feross/simple-peer)
 * Reimplemented in TypeScript with modern practices:
 * 
 * - Full RTCPeerConnection lifecycle management
 * - ICE candidate gathering with trickle and non-trickle modes
 * - ICE gathering timeout for reliability
 * - Batched negotiation to prevent rapid re-negotiations
 * - Glare resolution via timestamp tokens
 * - Backpressure handling with bufferedAmountLowThreshold
 * - Automatic message chunking for large payloads
 * - Browser quirk workarounds (Chrome closing state, etc.)
 */

import { EventEmitter } from './EventEmitter'
import { encodePacket, decodePacket, type DecodedPacket } from './chunking'

// Configuration constants (aligned with simple-peer)
const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:global.stun.twilio.com:3478'] }
]

const CHANNEL_NAME = 'sobaka-data'
const CHUNK_SIZE = 16 * 1024 - 512 // 16KB minus header space
const MAX_BUFFERED_AMOUNT = 64 * 1024
const TX_CLEANUP_DELAY = 30_000 // 30 seconds
const ICE_COMPLETE_TIMEOUT = 5_000 // 5 seconds
const CHANNEL_CLOSING_TIMEOUT = 5_000 // 5 seconds

export interface WebRTCPeerOptions {
  /** Set to true if this peer initiates the connection */
  initiator?: boolean
  /** Custom ICE server configuration */
  iceServers?: RTCIceServer[]
  /** Disable trickle ICE (wait for all candidates before signaling) */
  trickle?: boolean
  /** Allow half-trickle mode (send offer before all candidates) */
  allowHalfTrickle?: boolean
  /** Data channel configuration */
  channelConfig?: RTCDataChannelInit
  /** Data channel name */
  channelName?: string
  /** Offer options for createOffer() */
  offerOptions?: RTCOfferOptions
  /** Answer options for createAnswer() */
  answerOptions?: RTCAnswerOptions
  /** SDP transform function for advanced manipulation */
  sdpTransform?: (sdp: string) => string
}

export interface SignalData {
  type: 'offer' | 'answer' | 'candidate' | 'renegotiate'
  sdp?: string
  candidate?: RTCIceCandidateInit
  /** Glare resolution token */
  token?: number
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
  /** Emitted when ICE gathering times out */
  iceTimeout: () => void
  /** Emitted when negotiation completes */
  negotiated: () => void
}

export class WebRTCPeer extends EventEmitter<WebRTCPeerEvents> {
  private pc: RTCPeerConnection
  private channel: RTCDataChannel | null = null
  private readonly initiator: boolean
  private readonly trickle: boolean
  private readonly allowHalfTrickle: boolean
  private readonly channelConfig: RTCDataChannelInit
  private readonly channelName: string
  private readonly offerOptions: RTCOfferOptions
  private readonly answerOptions: RTCAnswerOptions
  private readonly sdpTransform: (sdp: string) => string
  
  // Connection state
  private _connected = false
  private _destroyed = false
  private _destroying = false
  private _pcReady = false
  private _channelReady = false
  private _iceComplete = false
  private pendingCandidates: RTCIceCandidateInit[] = []
  
  // Negotiation state (based on simple-peer)
  private _isNegotiating = false
  private _firstNegotiation = true
  private _batchedNegotiation = false
  private _queuedNegotiation = false
  private _iceCompleteTimer: ReturnType<typeof setTimeout> | null = null
  private _closingInterval: ReturnType<typeof setInterval> | null = null
  
  // Glare resolution (from y-webrtc)
  public glareToken: number | undefined = undefined
  
  // Chunking state
  private txOrdinal = 0
  private rxPackets: DecodedPacket[] = []
  private messageQueue: Uint8Array[] = []
  private sending = false
  
  // Backpressure
  private _chunk: Uint8Array | null = null
  private _cb: (() => void) | null = null

  constructor(options: WebRTCPeerOptions = {}) {
    super()
    
    this.initiator = options.initiator ?? false
    this.trickle = options.trickle ?? true
    this.allowHalfTrickle = options.allowHalfTrickle ?? false
    this.channelConfig = options.channelConfig ?? { ordered: true }
    this.channelName = options.channelName ?? CHANNEL_NAME
    this.offerOptions = options.offerOptions ?? {}
    this.answerOptions = options.answerOptions ?? {}
    this.sdpTransform = options.sdpTransform ?? ((sdp) => sdp)
    
    // Create RTCPeerConnection with unified-plan semantics
    this.pc = new RTCPeerConnection({
      iceServers: options.iceServers ?? DEFAULT_ICE_SERVERS,
      // @ts-expect-error - sdpSemantics is deprecated but still useful
      sdpSemantics: 'unified-plan'
    })
    
    this.setupPeerConnection()
    
    // If initiator, create the data channel and start negotiation
    if (this.initiator) {
      this.createDataChannel()
      this._needsNegotiation()
    }
  }

  /**
   * Process signaling data from the remote peer
   * Handles offers, answers, ICE candidates, and renegotiation requests
   */
  signal(data: SignalData | string): void {
    if (this._destroying) return
    if (this._destroyed) {
      throw this.createError('cannot signal after peer is destroyed', 'ERR_DESTROYED')
    }
    
    // Parse JSON string if needed
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data) as SignalData
      } catch {
        data = {} as SignalData
      }
    }
    
    // Handle renegotiation request (from non-initiator)
    if (data.type === 'renegotiate' && this.initiator) {
      this._needsNegotiation()
      return
    }
    
    // Handle ICE candidate
    if (data.candidate) {
      if (this.pc.remoteDescription?.type) {
        this.addIceCandidate(data.candidate)
      } else {
        // Queue candidate until we have remote description
        this.pendingCandidates.push(data.candidate)
      }
      return
    }
    
    // Handle SDP (offer or answer)
    if (data.sdp) {
      this.pc.setRemoteDescription({ type: data.type as RTCSdpType, sdp: data.sdp })
        .then(() => {
          if (this._destroyed) return
          
          // Add queued ICE candidates
          for (const candidate of this.pendingCandidates) {
            this.addIceCandidate(candidate)
          }
          this.pendingCandidates = []
          
          // If we received an offer, create an answer
          if (this.pc.remoteDescription?.type === 'offer') {
            this.createAnswer()
          }
        })
        .catch((err) => {
          this.destroy(this.createError(err.message, 'ERR_SET_REMOTE_DESCRIPTION'))
        })
      return
    }
    
    // Invalid signal data
    if (!data.type) {
      this.destroy(this.createError('signal() called with invalid signal data', 'ERR_SIGNALING'))
    }
  }

  /**
   * Send data to the remote peer
   * Automatically chunks large messages
   */
  send(data: Uint8Array | ArrayBuffer | string): void {
    if (this._destroying) return
    if (this._destroyed) {
      throw this.createError('cannot send after peer is destroyed', 'ERR_DESTROYED')
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
    
    // If not connected yet, queue for later
    if (!this._connected) {
      this._chunk = bytes
      return
    }
    
    if (!this.channel || this.channel.readyState !== 'open') {
      throw this.createError('Data channel is not open', 'ERR_DATA_CHANNEL')
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
   * Request negotiation (from non-initiator)
   */
  negotiate(): void {
    if (this._destroying) return
    if (this._destroyed) {
      throw this.createError('cannot negotiate after peer is destroyed', 'ERR_DESTROYED')
    }
    
    if (this.initiator) {
      if (this._isNegotiating) {
        this._queuedNegotiation = true
      } else {
        // Use setTimeout to avoid Chrome crash on immediate createOffer
        setTimeout(() => this.createOffer(), 0)
      }
    } else {
      if (!this._isNegotiating) {
        this.emit('signal', { type: 'renegotiate' })
      }
    }
    this._isNegotiating = true
  }

  /**
   * Destroy the peer connection
   */
  destroy(error?: Error): void {
    if (this._destroyed || this._destroying) return
    this._destroying = true
    
    // Use queueMicrotask to allow concurrent events to fire (from simple-peer)
    queueMicrotask(() => {
      this._destroyed = true
      this._destroying = false
      this._connected = false
      this._pcReady = false
      this._channelReady = false
      
      // Clear timers
      if (this._iceCompleteTimer) {
        clearTimeout(this._iceCompleteTimer)
        this._iceCompleteTimer = null
      }
      if (this._closingInterval) {
        clearInterval(this._closingInterval)
        this._closingInterval = null
      }
      
      // Clear state
      this.messageQueue = []
      this.rxPackets = []
      this._chunk = null
      this._cb = null
      
      // Close data channel
      if (this.channel) {
        try {
          this.channel.close()
        } catch {}
        this.channel.onmessage = null
        this.channel.onopen = null
        this.channel.onclose = null
        this.channel.onerror = null
        this.channel = null
      }
      
      // Close peer connection
      if (this.pc) {
        try {
          this.pc.close()
        } catch {}
        this.pc.oniceconnectionstatechange = null
        this.pc.onicegatheringstatechange = null
        this.pc.onsignalingstatechange = null
        this.pc.onconnectionstatechange = null
        this.pc.onicecandidate = null
        this.pc.ondatachannel = null
      }
      
      if (error) {
        this.emit('error', error)
      }
      this.emit('close')
      this.removeAllListeners()
    })
  }

  /**
   * Check if the peer is connected and channel is open
   */
  get connected(): boolean {
    return this._connected && this.channel?.readyState === 'open'
  }

  /**
   * Check if destroyed
   */
  get destroyed(): boolean {
    return this._destroyed
  }

  /**
   * Get buffered amount
   */
  get bufferSize(): number {
    return this.channel?.bufferedAmount ?? 0
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

  private createError(message: string, code: string): Error & { code: string } {
    const err = new Error(message) as Error & { code: string }
    err.code = code
    return err
  }

  private setupPeerConnection(): void {
    // Handle ICE candidates
    this.pc.onicecandidate = (event) => {
      if (this._destroyed) return
      
      if (event.candidate && this.trickle) {
        // Set glare token on first signal
        if (this.glareToken === undefined) {
          this.glareToken = Date.now() + Math.random()
        }
        
        this.emit('signal', {
          type: 'candidate',
          candidate: {
            candidate: event.candidate.candidate,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            sdpMid: event.candidate.sdpMid
          },
          token: this.glareToken
        })
      } else if (!event.candidate && !this._iceComplete) {
        // ICE gathering complete
        this._iceComplete = true
        this.emit('_iceComplete' as keyof WebRTCPeerEvents)
      }
      
      // Start timeout on first candidate
      if (event.candidate) {
        this.startIceCompleteTimeout()
      }
    }

    // Handle ICE gathering state changes
    this.pc.onicegatheringstatechange = () => {
      if (this._destroyed) return
      this.onIceStateChange()
    }

    // Handle ICE connection state changes
    this.pc.oniceconnectionstatechange = () => {
      if (this._destroyed) return
      this.onIceStateChange()
    }

    // Handle connection state changes
    this.pc.onconnectionstatechange = () => {
      if (this._destroyed) return
      if (this.pc.connectionState === 'failed') {
        this.destroy(this.createError('Connection failed.', 'ERR_CONNECTION_FAILURE'))
      }
    }

    // Handle signaling state changes
    this.pc.onsignalingstatechange = () => {
      if (this._destroyed) return
      this.onSignalingStateChange()
    }

    // Handle incoming data channel (for non-initiator)
    this.pc.ondatachannel = (event) => {
      this.setupDataChannel(event.channel)
    }
  }

  private createDataChannel(): void {
    const channel = this.pc.createDataChannel(this.channelName, this.channelConfig)
    this.setupDataChannel(channel)
  }

  private setupDataChannel(channel: RTCDataChannel): void {
    if (!channel) {
      this.destroy(this.createError('Data channel event is missing channel property', 'ERR_DATA_CHANNEL'))
      return
    }
    
    this.channel = channel
    this.channel.binaryType = 'arraybuffer'
    
    // Set threshold for backpressure
    if (typeof this.channel.bufferedAmountLowThreshold === 'number') {
      this.channel.bufferedAmountLowThreshold = MAX_BUFFERED_AMOUNT
    }
    
    this.channel.onopen = () => {
      if (this._connected || this._destroyed) return
      this._channelReady = true
      this.maybeReady()
    }
    
    this.channel.onclose = () => {
      if (this._destroyed) return
      this.destroy()
    }
    
    this.channel.onerror = (event) => {
      const err = (event as RTCErrorEvent).error
      const message = err?.message ?? 'Data channel error'
      this.destroy(this.createError(message, 'ERR_DATA_CHANNEL'))
    }
    
    this.channel.onmessage = (event) => {
      if (this._destroyed) return
      this.onChannelMessage(event)
    }
    
    this.channel.onbufferedamountlow = () => {
      this.onChannelBufferedAmountLow()
    }
    
    // Chrome workaround: check for stuck "closing" state
    let isClosing = false
    this._closingInterval = setInterval(() => {
      if (this.channel?.readyState === 'closing') {
        if (isClosing) {
          this.destroy() // closing timed out
        }
        isClosing = true
      } else {
        isClosing = false
      }
    }, CHANNEL_CLOSING_TIMEOUT)
  }

  private _needsNegotiation(): void {
    if (this._batchedNegotiation) return
    this._batchedNegotiation = true
    
    queueMicrotask(() => {
      this._batchedNegotiation = false
      if (this.initiator || !this._firstNegotiation) {
        this.negotiate()
      }
      this._firstNegotiation = false
    })
  }

  private createOffer(): void {
    if (this._destroyed) return
    
    this.pc.createOffer(this.offerOptions)
      .then((offer) => {
        if (this._destroyed) return
        
        // Filter trickle lines if trickle is disabled
        let sdp = offer.sdp!
        if (!this.trickle && !this.allowHalfTrickle) {
          sdp = sdp.replace(/a=ice-options:trickle\s\n/g, '')
        }
        sdp = this.sdpTransform(sdp)
        
        return this.pc.setLocalDescription({ type: 'offer', sdp })
          .then(() => {
            if (this._destroyed) return
            
            const sendOffer = () => {
              if (this._destroyed) return
              
              // Set glare token
              if (this.glareToken === undefined) {
                this.glareToken = Date.now() + Math.random()
              }
              
              const signal = this.pc.localDescription || offer
              this.emit('signal', {
                type: signal.type as 'offer',
                sdp: signal.sdp,
                token: this.glareToken
              })
            }
            
            if (this.trickle || this._iceComplete) {
              sendOffer()
            } else {
              this.once('_iceComplete' as keyof WebRTCPeerEvents, sendOffer)
            }
          })
      })
      .catch((err) => {
        this.destroy(this.createError(err.message, 'ERR_CREATE_OFFER'))
      })
  }

  private createAnswer(): void {
    if (this._destroyed) return
    
    this.pc.createAnswer(this.answerOptions)
      .then((answer) => {
        if (this._destroyed) return
        
        let sdp = answer.sdp!
        if (!this.trickle && !this.allowHalfTrickle) {
          sdp = sdp.replace(/a=ice-options:trickle\s\n/g, '')
        }
        sdp = this.sdpTransform(sdp)
        
        return this.pc.setLocalDescription({ type: 'answer', sdp })
          .then(() => {
            if (this._destroyed) return
            
            const sendAnswer = () => {
              if (this._destroyed) return
              const signal = this.pc.localDescription || answer
              this.emit('signal', {
                type: signal.type as 'answer',
                sdp: signal.sdp
              })
            }
            
            if (this.trickle || this._iceComplete) {
              sendAnswer()
            } else {
              this.once('_iceComplete' as keyof WebRTCPeerEvents, sendAnswer)
            }
          })
      })
      .catch((err) => {
        this.destroy(this.createError(err.message, 'ERR_CREATE_ANSWER'))
      })
  }

  private addIceCandidate(candidate: RTCIceCandidateInit): void {
    this.pc.addIceCandidate(new RTCIceCandidate(candidate))
      .catch((err) => {
        // Ignore errors for mDNS candidates (*.local)
        if (!candidate.candidate?.includes('.local')) {
          this.destroy(this.createError(err.message, 'ERR_ADD_ICE_CANDIDATE'))
        }
      })
  }

  private startIceCompleteTimeout(): void {
    if (this._destroyed) return
    if (this._iceCompleteTimer) return
    
    this._iceCompleteTimer = setTimeout(() => {
      if (!this._iceComplete) {
        this._iceComplete = true
        this.emit('iceTimeout')
        this.emit('_iceComplete' as keyof WebRTCPeerEvents)
      }
    }, ICE_COMPLETE_TIMEOUT)
  }

  private onIceStateChange(): void {
    const state = this.pc.iceConnectionState
    
    if (state === 'connected' || state === 'completed') {
      this._pcReady = true
      this.maybeReady()
    }
    if (state === 'failed') {
      this.destroy(this.createError('Ice connection failed.', 'ERR_ICE_CONNECTION_FAILURE'))
    }
    if (state === 'closed') {
      this.destroy(this.createError('Ice connection closed.', 'ERR_ICE_CONNECTION_CLOSED'))
    }
  }

  private onSignalingStateChange(): void {
    if (this.pc.signalingState === 'stable') {
      this._isNegotiating = false
      
      if (this._queuedNegotiation) {
        this._queuedNegotiation = false
        this._needsNegotiation()
      } else {
        this.emit('negotiated')
      }
    }
  }

  private maybeReady(): void {
    if (this._connected || !this._pcReady || !this._channelReady) return
    
    this._connected = true
    
    // Send any data that was queued before connect
    if (this._chunk) {
      try {
        this.send(this._chunk)
      } catch (err) {
        return this.destroy(this.createError((err as Error).message, 'ERR_DATA_CHANNEL'))
      }
      this._chunk = null
    }
    
    this.emit('connect')
  }

  private onChannelBufferedAmountLow(): void {
    if (this._destroyed || !this._cb) return
    const cb = this._cb
    this._cb = null
    cb()
  }

  private onChannelMessage(event: MessageEvent): void {
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
      // Check buffer for backpressure
      if (this.channel.bufferedAmount > MAX_BUFFERED_AMOUNT) {
        // Wait for buffer to drain
        this._cb = () => this.processMessageQueue()
        return
      }
      
      const message = this.messageQueue.shift()!
      try {
        // RTCDataChannel.send accepts Uint8Array in browsers
        this.channel.send(message as unknown as ArrayBuffer)
      } catch (err) {
        // RTCDataChannel.readyState is not 'open'
        const error = err as Error & { code?: number }
        if (error.code === 11) {
          // Channel not open, queue for later
          this.messageQueue.unshift(message)
        }
        break
      }
    }
    
    this.sending = false
  }
}

// Static property for WebRTC support detection
export const WEBRTC_SUPPORT = typeof RTCPeerConnection !== 'undefined'
