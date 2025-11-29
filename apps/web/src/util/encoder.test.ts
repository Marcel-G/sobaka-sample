import { test, describe } from 'node:test'
import assert from 'node:assert'
import { encodePacket, decodePacket } from './encoder'

describe('Packet Encoder/Decoder', () => {
  describe('encodePacket', () => {
    test('should encode a basic packet correctly', () => {
      const testChunk = new Uint8Array([1, 2, 3, 4, 5])
      const packetData = {
        chunk: testChunk,
        txOrd: 12345,
        index: 0,
        length: 5,
        totalSize: 5,
        chunkSize: 1
      }

      const encoded = encodePacket(packetData)

      // Should be 40 bytes (5 * 8 bytes for header) + chunk size
      assert.strictEqual(encoded.length, 40 + testChunk.length)

      // Verify it's a Uint8Array
      assert.ok(encoded instanceof Uint8Array)
    })

    test('should encode packet with maximum values', () => {
      const testChunk = new Uint8Array(1).fill(255)
      const packetData = {
        chunk: testChunk,
        txOrd: Number.MAX_SAFE_INTEGER,
        index: 999999,
        length: 1,
        totalSize: 1 * 10,
        chunkSize: 1
      }

      const encoded = encodePacket(packetData)
      assert.strictEqual(encoded.length, 40 + 1)
    })

    test('should encode packet with zero values', () => {
      const testChunk = new Uint8Array([])
      const packetData = {
        chunk: testChunk,
        txOrd: 0,
        index: 0,
        length: 0,
        totalSize: 0,
        chunkSize: 0
      }

      const encoded = encodePacket(packetData)
      assert.strictEqual(encoded.length, 40) // Just header, no chunk data
    })

    test('should encode packet with large chunk', () => {
      const largeChunk = new Uint8Array(1)
      // Fill with some pattern to verify later
      for (let i = 0; i < largeChunk.length; i++) {
        largeChunk[i] = i % 256
      }

      const packetData = {
        chunk: largeChunk,
        txOrd: 98765,
        index: 42,
        length: 1,
        totalSize: 1 * 3,
        chunkSize: 1
      }

      const encoded = encodePacket(packetData)
      assert.strictEqual(encoded.length, 40 + 1)
    })
  })

  describe('decodePacket', () => {
    test('should decode a basic packet correctly', () => {
      const testChunk = new Uint8Array([1, 2, 3, 4, 5])
      const originalData = {
        chunk: testChunk,
        txOrd: 12345,
        index: 0,
        length: 5,
        totalSize: 5,
        chunkSize: 1
      }

      const encoded = encodePacket(originalData)
      const decoded = decodePacket(encoded)

      assert.strictEqual(decoded.txOrd, originalData.txOrd)
      assert.strictEqual(decoded.index, originalData.index)
      assert.strictEqual(decoded.length, originalData.length)
      assert.strictEqual(decoded.totalSize, originalData.totalSize)
      assert.strictEqual(decoded.chunkSize, originalData.chunkSize)
      assert.deepStrictEqual(decoded.chunk, originalData.chunk)
    })

    test('should decode packet with zero values', () => {
      const testChunk = new Uint8Array([])
      const originalData = {
        chunk: testChunk,
        txOrd: 0,
        index: 0,
        length: 0,
        totalSize: 0,
        chunkSize: 0
      }

      const encoded = encodePacket(originalData)
      const decoded = decodePacket(encoded)

      assert.strictEqual(decoded.txOrd, 0)
      assert.strictEqual(decoded.index, 0)
      assert.strictEqual(decoded.length, 0)
      assert.strictEqual(decoded.totalSize, 0)
      assert.strictEqual(decoded.chunkSize, 0)
      assert.strictEqual(decoded.chunk.length, 0)
    })

    test('should decode packet with large values', () => {
      const testChunk = new Uint8Array(100).fill(42)
      const originalData = {
        chunk: testChunk,
        txOrd: 999999,
        index: 123,
        length: 100,
        totalSize: 1000,
        chunkSize: 1
      }

      const encoded = encodePacket(originalData)
      const decoded = decodePacket(encoded)

      assert.strictEqual(decoded.txOrd, originalData.txOrd)
      assert.strictEqual(decoded.index, originalData.index)
      assert.strictEqual(decoded.length, originalData.length)
      assert.strictEqual(decoded.totalSize, originalData.totalSize)
      assert.strictEqual(decoded.chunkSize, originalData.chunkSize)
      assert.deepStrictEqual(decoded.chunk, originalData.chunk)
    })

    test('should handle packet with maximum safe integer values', () => {
      const testChunk = new Uint8Array([255, 0, 128])
      const originalData = {
        chunk: testChunk,
        txOrd: Number.MAX_SAFE_INTEGER,
        index: Number.MAX_SAFE_INTEGER - 1,
        length: 3,
        totalSize: Number.MAX_SAFE_INTEGER - 2,
        chunkSize: 1
      }

      const encoded = encodePacket(originalData)
      const decoded = decodePacket(encoded)

      assert.strictEqual(decoded.txOrd, originalData.txOrd)
      assert.strictEqual(decoded.index, originalData.index)
      assert.strictEqual(decoded.length, originalData.length)
      assert.strictEqual(decoded.totalSize, originalData.totalSize)
      assert.strictEqual(decoded.chunkSize, originalData.chunkSize)
      assert.deepStrictEqual(decoded.chunk, originalData.chunk)
    })
  })

  describe('Round-trip encoding/decoding', () => {
    test('should preserve data through encode-decode cycle', () => {
      const testCases = [
        {
          chunk: new Uint8Array([]),
          txOrd: 1,
          index: 0,
          length: 0,
          totalSize: 100,
          chunkSize: 1
        },
        {
          chunk: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
          txOrd: 12345,
          index: 5,
          length: 10,
          totalSize: 50,
          chunkSize: 1
        },
        {
          chunk: new Uint8Array(1000).fill(0xab),
          txOrd: 999999999,
          index: 999,
          length: 1000,
          totalSize: 10000,
          chunkSize: 1
        }
      ]

      testCases.forEach((originalData, i) => {
        const encoded = encodePacket(originalData)
        const decoded = decodePacket(encoded)

        assert.strictEqual(
          decoded.txOrd,
          originalData.txOrd,
          `Test case ${i}: txOrd mismatch`
        )
        assert.strictEqual(
          decoded.index,
          originalData.index,
          `Test case ${i}: index mismatch`
        )
        assert.strictEqual(
          decoded.length,
          originalData.length,
          `Test case ${i}: length mismatch`
        )
        assert.strictEqual(
          decoded.totalSize,
          originalData.totalSize,
          `Test case ${i}: totalSize mismatch`
        )
        assert.strictEqual(
          decoded.chunkSize,
          originalData.chunkSize,
          `Test case ${i}: chunkSize mismatch`
        )
        assert.deepStrictEqual(
          decoded.chunk,
          originalData.chunk,
          `Test case ${i}: chunk data mismatch`
        )
      })
    })
  })
})
