/**
 * WebRTC networking stack for Sobaka
 * 
 * This module provides a complete replacement for simple-peer and y-webrtc:
 * 
 * ## New Architecture (recommended):
 * - PeerManager: Singleton managing all WebRTC connections (one per peer)
 * - Topic: Lightweight wrapper for a communication channel (uses shared connections)
 * 
 * ## Legacy Architecture (deprecated):
 * - Room: Old approach with separate connections per room
 * - WebRTCPeer: Low-level peer wrapper (still used internally)
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

// New architecture (recommended)
export { PeerManager, type PeerManagerOptions, type PeerManagerEvents, type PeerInfo, type TopicChannel } from './PeerManager'
export { Topic, type TopicOptions, type TopicEvents, type TopicPeer } from './Topic'

// Legacy components (for backwards compatibility)
export { WebRTCPeer, WEBRTC_SUPPORT, type WebRTCPeerOptions, type SignalData, type WebRTCPeerEvents } from './WebRTCPeer'
export { SignalingClient, type SignalingClientOptions, type SignalingClientEvents, type SignalingMessage, type MessageData, type PeerKind } from './SignalingClient'
export { Room, type RoomOptions, type RoomEvents, type PeerConnection } from './Room'

// Utilities
export { EventEmitter, type EventMap } from './EventEmitter'
export { encodePacket, decodePacket, calculateChunkCount, type PacketData, type DecodedPacket } from './chunking'
