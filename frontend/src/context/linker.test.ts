import { findPath, type PathRequest } from './linker'
import { describe, it } from 'node:test'
import { strict as assert } from 'assert'
import type { Point, Rectangle } from './positions'

describe('findPath', () => {
  describe('simple cases', () => {
    it('should find a simple direct path', () => {
      const start: Point = { x: 0, y: 0 }
      const end: Point = { x: 5, y: 0 }
      const obstacles: Rectangle[] = []

      const [{ path }] = findPath([{ start, end, startId: 'A', endId: 'B' }], obstacles)
      assert.deepEqual(path, [start, end])
    })

    it('should handle off-grid start and end points', () => {
      const start = { x: 72, y: 23 }
      const end = { x: 148, y: 47 }
      const obstacles: Rectangle[] = []

      const [{ path }] = findPath([{ start, end, startId: 'A', endId: 'B' }], obstacles)

      assert.deepEqual(path, [start, { x: 148, y: 23 }, end])
    })

    it('should find a path avoiding an obstacle', () => {
      const start: Point = { x: 0, y: 0 }
      const end: Point = { x: 70, y: 0 }
      const obstacles: Rectangle[] = [{ x1: 20, y1: 0, x2: 50, y2: 10 }]

      const [{ path }] = findPath([{ start, end, startId: 'A', endId: 'B' }], obstacles)
      assert.deepEqual(path, [start, { x: 0, y: 15 }, { x: 70, y: 15 }, end])
    })

    it('should find a complex path around multiple obstacles', () => {
      const start: Point = { x: 0, y: 0 }
      const end: Point = { x: 110, y: 0 }
      const obstacles: Rectangle[] = [
        { x1: 30, y1: -1, x2: 40, y2: 10 },
        { x1: 60, y1: -1, x2: 80, y2: 10 }
      ]

      const [{ path }] = findPath([{ start, end, startId: 'A', endId: 'B' }], obstacles)
      JSON.stringify(path)
      assert.deepEqual(path, [
        start,
        { x: 25, y: 0 },
        { x: 25, y: 15 },
        { x: 110, y: 15 },
        end
      ])
    })

    it('should path fully enclosed start / end points', () => {
      const start: Point = { x: 20, y: 20 }
      const end: Point = { x: 10, y: 10 }

      // Start and end points are inside an obstacle
      const obstacles: Rectangle[] = [{ x1: 0, y1: 0, x2: 30, y2: 30 }]

      const [{ path }] = findPath([{ start, end, startId: 'A', endId: 'B' }], obstacles)
      assert.deepEqual(path, [start, { x: 20, y: 10 }, end])
    })

    it('should avoid overlapping paths', () => {
      const requestA: PathRequest = {
        start: { x: 0, y: 0 },
        end: { x: 50, y: 0 },
        startId: 'A', endId: 'B'
      }
      const requestB: PathRequest = {
        start: { x: 20, y: 0 },
        end: { x: 100, y: 0 },
        startId: 'C', endId: 'D'
      }

      const obstacles: Rectangle[] = [
        { x1: 40, y1: -1, x2: 40, y2: 10 },
        { x1: 60, y1: -1, x2: 80, y2: 10 }
      ]

      const [{ path: pathA }, { path: pathB }] = findPath([requestA, requestB], obstacles)
      assert.deepEqual(pathA, [requestA.start, requestA.end])

      assert.deepEqual(pathB, [
        requestB.start,
        { x: 20, y: 15 },
        { x: 100, y: 15 },
        requestB.end
      ])
    })
  })

  describe('real cases', () => {
    it('should find a simple path', () => {
      const start: Point = { x: 217, y: 199 }
      const end: Point = { x: 319, y: 167 }
      const obstacles: Rectangle[] = [
        { x1: 144, y1: 167, x2: 216, y2: 288 },
        { x1: 320, y1: 135, x2: 584, y2: 304 }
      ]

      const [{ path }] = findPath([{ start, end, startId: 'A', endId: 'B' }], obstacles)
      assert.deepEqual(path, [start, { x: 319, y: 199 }, end])
    })

    it('should avoid overlapping paths', () => {
      const requests: PathRequest[] = [
        {
          start: { x: 217, y: 199 },
          end: { x: 319, y: 167 },
          startId: 'A', endId: 'B'
        },
        {
          start: { x: 217, y: 211 },
          end: { x: 319, y: 179 },
          startId: 'C', endId: 'D'
        }
      ]

      const obstacles: Rectangle[] = [
        { x1: 320, y1: 135, x2: 584, y2: 304 },
        { x1: 144, y1: 167, x2: 216, y2: 288 }
      ]

      const [{ path: pathA }, { path: pathB }] = findPath(requests, obstacles)
      assert.deepEqual(pathA, [
        { x: 217, y: 199 },
        { x: 319, y: 199 },
        { x: 319, y: 167 }
      ])

      assert.deepEqual(pathB, [
        { x: 217, y: 211 },
        { x: 319, y: 211 },
        { x: 319, y: 179 }
      ])
    })

    it('should find a path avoiding obstacles', () => {
      const start: Point = {
        x: 75,
        y: 215
      }
      const end: Point = {
        x: 349,
        y: 135
      }
      const obstacles: Rectangle[] = [
        {
          x1: 352,
          y1: 103,
          x2: 616,
          y2: 272
        },
        {
          x1: 0,
          y1: 183,
          x2: 72,
          y2: 304
        },
        {
          x1: 176,
          y1: 103,
          x2: 248,
          y2: 224
        }
      ]

      const [{ path }] = findPath([{ start, end, startId: 'A', endId: 'B' }], obstacles)

      assert.deepEqual(path, [
        start,
        { x: 175, y: 215 },
        { x: 175, y: 235 },
        { x: 340, y: 235 },
        { x: 340, y: 135 },
        end
      ])
    })

    it('should find path when end point is very close to a grid point within obstacle', () => {
      const start: Point = {
        x: 134,
        y: 231
      }
      const end: Point = {
        x: 241, // The next grid point is 240, which is an obstacle
        y: 231
      }
      const obstacles: Rectangle[] = [
        { x1: 64, y1: 199, x2: 136, y2: 320 },
        { x1: 240, y1: 199, x2: 312, y2: 288 }
      ]

      const [{ path }] = findPath([{ start, end, startId: 'A', endId: 'B' }], obstacles)
      assert.deepEqual(path, [start, end])
    })

    it('REGRESSION: should prioritise path with fewer turns', () => {
      const start: Point = {
        x: 166,
        y: 215
      }
      const end: Point = {
        x: 434,
        y: 279
      }
      const obstacles: Rectangle[] = [
        { x1: 96, y1: 183, x2: 168, y2: 304 },
        { x1: 432, y1: 247, x2: 504, y2: 336 }
      ]

      const [{ path }] = findPath([{ start, end, startId: 'A', endId: 'B' }], obstacles)
      assert.deepEqual(path, [start, { x: 430, y: 215 }, { x: 430, y: 279 }, end])
    })
  })
})
