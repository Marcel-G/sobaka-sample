import SimplePeer from '@simple-peer'
import { decodePacket, encodePacket, type DecodedPacket } from './encoder.ts'

// Configuration constants for packet chunking and transmission
export const CHUNK_SIZE = 1024 * 16 - 512 // 16KB - 512 bytes reserved for packet headers
export const TX_SEND_TTL = 1000 * 30 // 30 seconds - timeout for cleaning up received packet buffers
export const MAX_BUFFERED_AMOUNT = 64 * 1024 // Maximum buffered amount before pausing transmission (matches simple-peer default)

/**
 * Extended SimplePeer class that handles chunking of large messages
 *
 * This class extends the simple-peer library to automatically split large messages
 * into smaller chunks that won't exceed WebRTC data channel limits. Each chunk
 * is encoded with metadata including transmission order, chunk index, and size
 * information to enable proper reassembly on the receiving end.
 */
class SimplePeerExtended extends SimplePeer {
  private _txOrdinal: number = 0 // Transmission order counter for tracking message sequences
  private _rxPackets: DecodedPacket[] = [] // Buffer for storing incomplete received message chunks
  private _txPause: boolean = false // Flag to pause transmission (currently unused)
  private webRTCMessageQueue: Uint8Array[] = [] // Queue of encoded packets waiting to be sent
  private webRTCPaused: boolean = false // Flag indicating if transmission is paused due to buffer limits

  /**
   * Splits a large message into smaller chunks and encodes each with metadata
   *
   * @param array - The data to be chunked (Uint8Array or ArrayBuffer)
   * @param size - Maximum size for each chunk
   * @returns Array of encoded packets ready for transmission
   */
  private packetArray(array: Uint8Array | ArrayBuffer, size: number): Uint8Array[] {
    const txOrd = this._txOrdinal
    this._txOrdinal++ // Increment for next message

    const chunkedArr: Uint8Array[] = []
    const data = array instanceof ArrayBuffer ? new Uint8Array(array) : array
    const totalSize = data.length
    let index = 0

    // Split the data into chunks of the specified size
    while (index < totalSize) {
      chunkedArr.push(data.slice(index, size + index))
      index += size
    }

    // Encode each chunk with its metadata
    return chunkedArr.map((chunk, index) => {
      return encodePacket({
        chunk,
        txOrd,
        index,
        totalSize,
        length: chunkedArr.length,
        chunkSize: chunk.byteLength
      })
    })
  }

  /**
   * Handles incoming WebRTC data channel messages
   * Processes chunked messages and reassembles them when all chunks are received
   *
   * @param event - MessageEvent from the WebRTC data channel
   */
  protected _onChannelMessage(event: MessageEvent): void {
    const { data } = event
    const packet = decodePacket(new Uint8Array(data))

    // Convert ArrayBuffer to Uint8Array if needed
    if (packet.chunk instanceof ArrayBuffer) {
      packet.chunk = new Uint8Array(packet.chunk)
    }

    // If this is a single-chunk message, deliver it immediately
    if (packet.chunkSize === packet.totalSize) {
      this.push(packet.chunk)
      return
    }

    // Handle multi-chunk messages
    const existingPackets = this._rxPackets.filter(p => p.txOrd === packet.txOrd)
    existingPackets.push(packet)

    const receivedIndices = existingPackets.map(p => p.index)

    // Check if we have received all chunks for this message
    if (new Set(receivedIndices).size === packet.length) {
      // Sort chunks by index to ensure correct order
      existingPackets.sort(this.sortPacketArray)

      // Reassemble the original message
      const totalLength = existingPackets.reduce((sum, p) => sum + p.chunk.length, 0)
      const reassembledData = new Uint8Array(totalLength)
      let offset = 0
      for (const packet of existingPackets) {
        reassembledData.set(packet.chunk, offset)
        offset += packet.chunk.length
      }

      // Deliver the complete message
      this.push(reassembledData)

      // Clean up received packets after a delay to prevent memory leaks
      setTimeout(() => {
        this._rxPackets = this._rxPackets.filter(p => p.txOrd !== packet.txOrd)
      }, TX_SEND_TTL)
    } else {
      // Store the packet for later reassembly
      this._rxPackets.push(packet)
    }
  }

  /**
   * Sorting function for packet arrays based on chunk index
   * @param a - First packet
   * @param b - Second packet
   * @returns Comparison result for sorting
   */
  private sortPacketArray(a: DecodedPacket, b: DecodedPacket): number {
    return a.index > b.index ? 1 : -1
  }

  /**
   * Sends data through the WebRTC data channel with automatic chunking
   * Large messages are split into smaller chunks to avoid size limits
   *
   * @param chunk - Data to send (Uint8Array or ArrayBuffer)
   */
  public send(chunk: Uint8Array | ArrayBuffer): void {
    const data = chunk instanceof ArrayBuffer ? new Uint8Array(chunk) : chunk
    const packets = this.packetArray(data, CHUNK_SIZE)

    // Add packets to transmission queue
    this.webRTCMessageQueue = this.webRTCMessageQueue.concat(packets)

    // Start transmission if not already paused
    if (!this.webRTCPaused) {
      this.sendMessageQueued()
    }
  }

  /**
   * Processes the message queue and sends packets while respecting buffer limits
   * Implements flow control by pausing transmission when buffer is full
   */
  private sendMessageQueued(): void {
    this.webRTCPaused = false
    let message = this.webRTCMessageQueue.shift()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const channel: RTCDataChannel = (this as any)._channel as RTCDataChannel

    while (message) {
      // Check if the data channel buffer is getting full
      if (channel?.bufferedAmount && channel.bufferedAmount > MAX_BUFFERED_AMOUNT) {
        // Pause transmission and wait for buffer to drain
        this.webRTCPaused = true
        this.webRTCMessageQueue.unshift(message) // Put message back in queue

        const listener = () => {
          channel?.removeEventListener('bufferedamountlow', listener)
          this.sendMessageQueued() // Resume transmission
        }
        channel?.addEventListener('bufferedamountlow', listener)
        return
      }

      try {
        // Send the packet using the parent class method
        super.send(message)
        message = this.webRTCMessageQueue.shift()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        console.warn('y-webrtc:simplepeer:sendMessageQueued', { error })
        // Handle specific error: data channel not open
        if (error.code === 11) {
          // RTCDataChannel.readyState is not 'open'
          // TODO: implement proper connection state handling
          // For now, we break the loop to prevent further errors
        }
        break
      }

      // Add small delay between sends if there are more messages
      // This helps prevent overwhelming the WebRTC stack
      if (this.webRTCMessageQueue.length > 0) {
        setTimeout(() => this.sendMessageQueued(), 200)
      }
    }
  }
}

export default SimplePeerExtended
