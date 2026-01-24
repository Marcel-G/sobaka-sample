/**
 * Message chunking utilities for WebRTC data channels
 * 
 * WebRTC data channels have message size limits. This module provides
 * encoding/decoding for chunked messages with metadata for reassembly.
 * 
 * Packet structure:
 * - 4 bytes: txOrd (transmission order)
 * - 4 bytes: index (chunk index)
 * - 4 bytes: length (total chunks)
 * - 4 bytes: totalSize (original message size)
 * - 4 bytes: chunkSize (this chunk's size)
 * - N bytes: chunk data
 * 
 * Total header: 20 bytes
 */

const HEADER_SIZE = 20

export interface PacketData {
  chunk: Uint8Array
  txOrd: number
  index: number
  length: number
  totalSize: number
  chunkSize: number
}

export interface DecodedPacket {
  txOrd: number
  index: number
  length: number
  totalSize: number
  chunkSize: number
  chunk: Uint8Array
}

/**
 * Encode a chunk with metadata into a packet
 */
export function encodePacket(data: PacketData): Uint8Array {
  const packet = new Uint8Array(HEADER_SIZE + data.chunk.length)
  const view = new DataView(packet.buffer)
  
  // Write header
  view.setUint32(0, data.txOrd, true)
  view.setUint32(4, data.index, true)
  view.setUint32(8, data.length, true)
  view.setUint32(12, data.totalSize, true)
  view.setUint32(16, data.chunkSize, true)
  
  // Write chunk data
  packet.set(data.chunk, HEADER_SIZE)
  
  return packet
}

/**
 * Decode a packet to extract metadata and chunk data
 */
export function decodePacket(packet: Uint8Array): DecodedPacket {
  const view = new DataView(packet.buffer, packet.byteOffset, packet.byteLength)
  
  // Read header
  const txOrd = view.getUint32(0, true)
  const index = view.getUint32(4, true)
  const length = view.getUint32(8, true)
  const totalSize = view.getUint32(12, true)
  const chunkSize = view.getUint32(16, true)
  
  // Read chunk data
  const chunk = packet.slice(HEADER_SIZE)
  
  return {
    txOrd,
    index,
    length,
    totalSize,
    chunkSize,
    chunk
  }
}

/**
 * Calculate the number of chunks needed for a given data size
 */
export function calculateChunkCount(dataSize: number, chunkSize: number): number {
  return Math.ceil(dataSize / chunkSize)
}
