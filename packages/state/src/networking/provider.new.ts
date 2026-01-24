/**
 * VerifiedRTCProvider - WebRTC provider with identity verification
 * 
 * This is a drop-in replacement for the old VerifiedRTCProvider that used y-webrtc.
 * It uses the new in-house WebRTC stack for full control over networking.
 */

import * as Y from 'yjs'
import { YjsWebRTCProvider, type YjsWebRTCProviderOptions, type PeerConnection } from './webrtc'
import { EventEmitter } from './webrtc/EventEmitter'

export interface VerifiedRTCProviderOptions {
  /** Maximum number of WebRTC connections */
  maxConns?: number
  /** Signaling server URL(s) */
  signaling: string[]
  /** Filter for incoming messages based on verified identity */
  filterIncomingMessage?: (identity: string, data: Uint8Array) => boolean
}

export type VerifiedRTCProviderEvents = {
  /** Peer list changed */
  peers: (peers: Map<string, PeerConnection>) => void
  /** User identity verified */
  user: (identity: string) => void
  /** Synced with peers */
  synced: (synced: boolean) => void
  /** Connection status changed */
  status: (status: { connected: boolean }) => void
  /** Error occurred */
  error: (error: Error) => void
}

/**
 * WebRTC provider with verified peer identities
 * 
 * Extends YjsWebRTCProvider to:
 * - Track verified peer identities from signaling server
 * - Filter messages based on identity for access control
 * - Emit user identity when verified by signaling server
 */
export class VerifiedRTCProvider extends EventEmitter<VerifiedRTCProviderEvents> {
  readonly provider: YjsWebRTCProvider
  private currentUser: string | null = null
  private verifiedPeerIdentities = new Map<string, string>()
  private verifiedWorkerIdentities = new Map<string, string>()

  constructor(
    name: string,
    doc: Y.Doc,
    options: VerifiedRTCProviderOptions
  ) {
    super()
    
    this.provider = new YjsWebRTCProvider({
      roomName: name,
      doc,
      signaling: options.signaling,
      maxConns: options.maxConns,
      filterIncomingMessage: options.filterIncomingMessage
        ? (identity, data) => {
            // Check if it's a worker identity
            if (this.verifiedWorkerIdentities.has(identity)) {
              return true // Allow all worker messages
            }
            
            // Check if this is a read-only message
            if (isReadOnlyMessage(data)) {
              return true
            }
            
            return options.filterIncomingMessage!(identity, data)
          }
        : undefined
    })
    
    this.setupProvider()
  }

  private setupProvider(): void {
    // Forward events
    this.provider.on('peers', (peers) => {
      this.emit('peers', peers)
    })
    
    this.provider.on('synced', (synced) => {
      this.emit('synced', synced)
    })
    
    this.provider.on('status', (status) => {
      this.emit('status', status)
    })
    
    this.provider.on('error', (err) => {
      this.emit('error', err)
    })
    
    // Handle user identity
    this.provider.on('user', (identity) => {
      this.currentUser = identity
      this.emit('user', identity)
    })
    
    // Track peer identities
    this.provider.room.on('peer:identity', (peerId, identity) => {
      this.verifiedPeerIdentities.set(peerId, identity)
    })
  }

  /**
   * Connect to the room
   */
  connect(): void {
    this.provider.connect()
  }

  /**
   * Disconnect from the room
   */
  disconnect(): void {
    this.provider.disconnect()
  }

  /**
   * Destroy the provider
   */
  destroy(): void {
    this.provider.destroy()
    this.removeAllListeners()
  }

  /**
   * Get the Yjs document
   */
  get doc(): Y.Doc {
    return this.provider.doc
  }

  /**
   * Get the awareness instance
   */
  get awareness() {
    return this.provider.awareness
  }

  /**
   * Get the room instance
   */
  get room() {
    return this.provider.room
  }

  /**
   * Get the peer ID
   */
  get peerId(): string {
    return this.provider.peerId
  }

  /**
   * Get current user's verified identity
   */
  get userIdentity(): string | null {
    return this.currentUser
  }

  /**
   * Get verified identity for a peer
   */
  getVerifiedIdentity(peerId: string): string | undefined {
    return this.verifiedPeerIdentities.get(peerId)
  }

  /**
   * Check if connected
   */
  get connected(): boolean {
    return this.provider.connected
  }

  /**
   * Get signaling connections (for compatibility)
   */
  get signalingConns(): Array<{ on: (event: string, handler: (...args: unknown[]) => void) => void }> {
    // Return a wrapper that exposes signaling events
    return [{
      on: (event: string, handler: (...args: unknown[]) => void) => {
        if (event === 'connect') {
          this.provider.room.on('signaling:connect', handler as () => void)
        } else if (event === 'disconnect') {
          this.provider.room.on('signaling:disconnect', handler as () => void)
        } else if (event === 'message') {
          // Messages from signaling are now handled internally
          // This is for backward compatibility only
        }
      }
    }]
  }
}

/**
 * Check if a message is read-only (should be allowed from any peer)
 */
function isReadOnlyMessage(data: Uint8Array): boolean {
  if (data.length < 2) return false
  
  const [byte1, byte2] = data
  
  // Allow SyncStep1 messages ([0, 0, ...])
  if (byte1 === 0 && byte2 === 0) return true
  
  // Allow awareness messages
  if (byte1 === 1) return true
  
  return false
}

export default VerifiedRTCProvider
