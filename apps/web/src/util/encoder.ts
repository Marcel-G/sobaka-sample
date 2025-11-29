import * as encoding from 'lib0/encoding'
import * as decoding from 'lib0/decoding'

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
 * Encodes a data chunk with metadata into a packet for transmission
 *
 * Packet structure (40 bytes header + chunk data):
 * - bytes 0-7:   txOrd (transmission order)
 * - bytes 8-15:  index (chunk index within message)
 * - bytes 16-23: length (total number of chunks in message)
 * - bytes 24-31: totalSize (original message size in bytes)
 * - bytes 32-39: chunkSize (size of this specific chunk)
 * - bytes 40+:   chunk (the actual data)
 *
 * @param packetData - Object containing chunk and metadata
 * @returns Encoded packet as Uint8Array
 */
export function encodePacket({
  chunk,
  txOrd,
  index,
  length,
  totalSize,
  chunkSize
}: PacketData): Uint8Array {
  const encoder = encoding.createEncoder()

  // Write header fields using variable-length encoding for efficiency
  encoding.writeBigUint64(encoder, BigInt(txOrd))
  encoding.writeBigUint64(encoder, BigInt(index))
  encoding.writeBigUint64(encoder, BigInt(length))
  encoding.writeBigUint64(encoder, BigInt(totalSize))
  encoding.writeBigUint64(encoder, BigInt(chunkSize))

  // Write the chunk data
  encoding.writeUint8Array(encoder, chunk)

  return encoding.toUint8Array(encoder)
}

/**
 * Decodes a received packet to extract metadata and chunk data
 *
 * @param array - The received packet data
 * @returns Decoded packet object with metadata and chunk
 */
export function decodePacket(array: Uint8Array): DecodedPacket {
  const decoder = decoding.createDecoder(array)

  // Read header fields in the same order they were written
  const txOrd = Number(decoding.readBigUint64(decoder))
  const index = Number(decoding.readBigUint64(decoder))
  const length = Number(decoding.readBigUint64(decoder))
  const totalSize = Number(decoding.readBigUint64(decoder))
  const chunkSize = Number(decoding.readBigUint64(decoder))

  // Read the remaining data as the chunk
  const chunk = decoding.readTailAsUint8Array(decoder)

  return {
    txOrd,
    index,
    length,
    totalSize,
    chunkSize,
    chunk
  }
}
