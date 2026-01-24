/**
 * WebRTC networking stack for Sobaka
 * 
 * This module provides a complete replacement for simple-peer and y-webrtc:
 * 
 * - WebRTCPeer: Low-level WebRTC connection wrapper with chunking
 * - SignalingClient: WebSocket client for signaling server communication
 * - Room: Manages peer discovery and connections within a room
 * - YjsWebRTCProvider: Yjs document synchronization over WebRTC
 * 
 * @example
 * ```typescript
 * import { YjsWebRTCProvider } from '@sobaka/state/networking/webrtc'
 * import * as Y from 'yjs'
 * 
 * const doc = new Y.Doc()
 * const provider = new YjsWebRTCProvider({
 *   roomName: 'my-room',
 *   doc,
 *   signaling: ['wss://signaling.example.com']
 * })
 * 
 * provider.on('synced', () => {
 *   console.log('Synced with peers!')
 * })
 * ```
 */

// Core components
export { WebRTCPeer, type WebRTCPeerOptions, type SignalData, type WebRTCPeerEvents } from './WebRTCPeer'
export { SignalingClient, type SignalingClientOptions, type SignalingClientEvents, type SignalingMessage, type MessageData } from './SignalingClient'
export { Room, type RoomOptions, type RoomEvents, type PeerConnection } from './Room'
export { YjsWebRTCProvider, createYjsWebRTCProvider, type YjsWebRTCProviderOptions, type YjsWebRTCProviderEvents } from './YjsProvider'

// Utilities
export { EventEmitter, type EventMap } from './EventEmitter'
export { encodePacket, decodePacket, calculateChunkCount, type PacketData, type DecodedPacket } from './chunking'
