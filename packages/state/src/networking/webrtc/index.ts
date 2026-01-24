/**
 * WebRTC networking stack for Sobaka
 * 
 * This module provides WebRTC-based peer-to-peer communication:
 * 
 * - PeerManager: Singleton managing all WebRTC connections (one per peer)
 * - Topic: Lightweight wrapper for a communication channel (uses shared connections)
 * - SignalingClient: WebSocket client for WebRTC signaling
 * 
 * The main provider (VerifiedRTCProvider) is exported from the parent module.
 * 
 * @example
 * ```typescript
 * import { VerifiedRTCProvider } from '@sobaka/state'
 * import * as Y from 'yjs'
 * 
 * const doc = new Y.Doc()
 * const provider = new VerifiedRTCProvider('my-room', doc, {
 *   signaling: ['wss://signaling.example.com']
 * })
 * 
 * provider.on('synced', () => {
 *   console.log('Synced with peers!')
 * })
 * ```
 */

// Core components
export { PeerManager, type PeerManagerOptions, type PeerManagerEvents, type PeerInfo, type TopicChannel } from './PeerManager'
export { Topic, type TopicOptions, type TopicEvents, type TopicPeer } from './Topic'
export { SignalingClient, type SignalingClientOptions, type SignalingClientEvents, type SignalingMessage, type MessageData, type PeerKind, type SignalData } from './SignalingClient'

// Utilities
export { EventEmitter, type EventMap } from './EventEmitter'
export { encodePacket, decodePacket, calculateChunkCount, type PacketData, type DecodedPacket } from './chunking'
