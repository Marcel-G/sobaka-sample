import { MinPriorityQueue as PriorityQueue } from '@datastructures-js/priority-queue'
import type { ModulePosition, PlugPosition, Point, Rectangle } from './positions'
import { plug_type, PlugType, type Link } from '/state/models/links'

export interface PathRequest {
  id?: string
  start: Point
  startId: string
  end: Point
  endId: string
}

export interface PathResponse {
  id?: string
  path: Point[]
  startId: string
  endId: string
}

// Add this interface to store direction information with points
interface PointWithDirection {
  point: Point
  direction?: { dx: number; dy: number }
}

const DIRECTIONS = [
  { dx: 0, dy: -1 }, // Up
  { dx: 0, dy: 1 }, // Down
  { dx: -1, dy: 0 }, // Left
  { dx: 1, dy: 0 } // Right
]

// Check if a point is within an obstacle
const isPointInObstacle = (
  point: Point,
  obstacles: Rectangle[],
  pad: number = 0
): boolean => {
  return obstacles.some(
    obstacle =>
      point.x >= obstacle.x1 - pad &&
      point.x <= obstacle.x2 + pad &&
      point.y >= obstacle.y1 - pad &&
      point.y <= obstacle.y2 + pad
  )
}

// Manhattan distance heuristic
export const manhattanDistance = (a: Point, b: Point, config: Config): number => {
  return (Math.abs(a.x - b.x) + Math.abs(a.y - b.y)) / config.gridStep
}

// Simplify the path by removing redundant points (i.e., straight line segments)
const simplifyPath = (path: Point[]): Point[] => {
  if (path.length <= 2) return path

  const simplifiedPath: Point[] = [path[0]]

  for (let i = 1; i < path.length - 1; i++) {
    const prev = simplifiedPath[simplifiedPath.length - 1]
    const curr = path[i]
    const next = path[i + 1]

    if (
      !(prev.x === curr.x && curr.x === next.x) &&
      !(prev.y === curr.y && curr.y === next.y)
    ) {
      simplifiedPath.push(curr)
    }
  }

  simplifiedPath.push(path[path.length - 1])
  return simplifiedPath
}

export const findPath = (
  requests: PathRequest[],
  obstacles: Rectangle[],
  config: Config = { gridStep: 5 }
): PathResponse[] => {
  const paths: PathResponse[] = []
  const occupiedPoints = new Map<string, number>()

  for (const request of requests) {
    const path = aStarSearch(
      request.start,
      request.end,
      obstacles,
      occupiedPoints,
      config
    )
    for (const point of path) {
      const key = `${point.x},${point.y}`
      occupiedPoints.set(key, (occupiedPoints.get(key) ?? 0) + 1)
    }
    paths.push({
      id: request.id,
      path,
      startId: request.startId,
      endId: request.endId
    })
  }

  return paths
    .map(({ path, ...rest }) => ({ ...rest, path: simplifyPath(path) }))
    .filter(({ path }) => path.length > 0)
}

const toGrid = (v: number, config: Config): number => {
  return Math.round(v / config.gridStep) * config.gridStep
}

const isBetween = (test: number, a: number, b: number): boolean => {
  return test > Math.min(a, b) && test < Math.max(a, b)
}

const snapToValidLines = (
  value: number,
  current: number,
  validLines: number[],
  config: Config
): number => {
  // First check if we should snap to any valid lines
  for (const line of validLines) {
    if (isBetween(line, current, value)) {
      return line
    }
  }
  // Otherwise snap to grid
  return toGrid(value, config)
}

const createNeighbor = (
  current: Point,
  { dx, dy }: { dx: number; dy: number },
  start: Point,
  end: Point,
  config: Config
): Point => {
  const x = current.x + dx * config.gridStep
  const y = current.y + dy * config.gridStep

  return {
    x: dx !== 0 ? snapToValidLines(x, current.x, [start.x, end.x], config) : current.x,
    y: dy !== 0 ? snapToValidLines(y, current.y, [start.y, end.y], config) : current.y
  }
}

// Add function to calculate direction change penalty
const calculateDirectionChangePenalty = (
  current: PointWithDirection,
  newDirection: { dx: number; dy: number }
): number => {
  if (!current.direction) return 0

  // If direction changes, add penalty
  if (
    current.direction.dx !== newDirection.dx ||
    current.direction.dy !== newDirection.dy
  ) {
    return 1
  }
  return 0
}

type Config = {
  gridStep: number
}

const aStarSearch = (
  start: Point,
  end: Point,
  obstacles: Rectangle[],
  occupiedPoints: Map<string, number>,
  config: Config
): Point[] => {
  const boundary = calculateBoundary(obstacles, [start, end])

  const openList = new PriorityQueue<[PointWithDirection, number]>(([, score]) => score)
  const closedList: Set<string> = new Set()
  const cameFrom: Map<string, PointWithDirection> = new Map()
  const gScore: Map<string, number> = new Map()
  const fScore: Map<string, number> = new Map()

  const startPoint: PointWithDirection = { point: start }
  const startKey = `${start.x},${start.y}`
  const endKey = `${end.x},${end.y}`

  gScore.set(startKey, 0)
  fScore.set(startKey, manhattanDistance(start, end, config))
  openList.enqueue([startPoint, fScore.get(startKey)!])

  while (!openList.isEmpty()) {
    const [current] = openList.dequeue()!
    const currentKey = `${current.point.x},${current.point.y}`

    if (currentKey === endKey) {
      return reconstructPath(cameFrom, current)
    }

    closedList.add(currentKey)

    for (const dir of DIRECTIONS) {
      const neighbor = createNeighbor(current.point, dir, start, end, config)
      const neighborKey = `${neighbor.x},${neighbor.y}`
      const neighborWithDir: PointWithDirection = {
        point: neighbor,
        direction: dir
      }

      if (
        neighbor.x < 0 ||
        neighbor.x > boundary.xMax ||
        neighbor.y < 0 ||
        neighbor.y > boundary.yMax ||
        closedList.has(neighborKey)
      ) {
        continue
      }

      const directionChangePenalty = calculateDirectionChangePenalty(current, dir) * 10
      const innerObstaclePenalty = isPointInObstacle(neighbor, obstacles) ? 5 : 0
      const obstaclePenalty = isPointInObstacle(neighbor, obstacles, 10) ? 1 : 0
      const occupiedPenalty = (occupiedPoints.get(neighborKey) ?? 0) * 1

      const tentativeGScore =
        (gScore.get(currentKey) ?? Infinity) +
        1 +
        innerObstaclePenalty +
        obstaclePenalty +
        directionChangePenalty +
        occupiedPenalty

      if (tentativeGScore < (gScore.get(neighborKey) ?? Infinity)) {
        cameFrom.set(neighborKey, current)
        gScore.set(neighborKey, tentativeGScore)

        fScore.set(
          neighborKey,
          tentativeGScore + manhattanDistance(neighbor, end, config)
        )
        openList.enqueue([neighborWithDir, fScore.get(neighborKey)!])
      }
    }
  }

  return []
}

// Reconstruct path from the "cameFrom" map
const reconstructPath = (
  cameFrom: Map<string, PointWithDirection>,
  current: PointWithDirection
): Point[] => {
  const path: Point[] = []
  while (current) {
    path.push(current.point)
    const currentKey = `${current.point.x},${current.point.y}`
    current = cameFrom.get(currentKey)!
  }
  return path.reverse()
}

// Calculate boundary based on obstacles and points
const calculateBoundary = (
  obstacles: Rectangle[],
  points: Point[]
): { xMax: number; yMax: number } => {
  let xMax = 0
  let yMax = 0

  for (const obstacle of obstacles) {
    xMax = Math.max(xMax, obstacle.x2)
    yMax = Math.max(yMax, obstacle.y2)
  }

  for (const point of points) {
    xMax = Math.max(xMax, point.x)
    yMax = Math.max(yMax, point.y)
  }

  return { xMax: xMax + 10, yMax: yMax + 10 }
}

const GRID_STEP = 8

export const linker = (
  links: Link[],
  plugPositions: Map<string, PlugPosition>,
  modulePositions: Map<string, ModulePosition>
) => {
  const obstacles = Array.from(modulePositions.values().map(module => module.position))

  const requests: PathRequest[] = links.flatMap(link => {
    const end = plugPositions.get(link.from)?.position
    const start = plugPositions.get(link.to)?.position

    // Add special case for the output mixer.
    // We don't want to have a wire going all the way there because
    // it would cause clutter.
    if (end && plug_type(link.to) === PlugType.Mixer) {
      return [
        {
          id: link.id,
          startId: link.to,
          end,
          endId: link.to,
          start: { x: end.x + GRID_STEP * 3, y: end.y }
        }
      ]
    }

    if (!start || !end) {
      return []
    }

    return [
      {
        id: link.id,
        startId: link.to,
        start,
        endId: link.from,
        end
      }
    ]
  })

  return findPath(requests, obstacles, { gridStep: GRID_STEP })
}
