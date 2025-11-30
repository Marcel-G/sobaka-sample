import type { LinkPoint } from '@sobaka/state'
import { get, readonly, writable } from 'svelte/store'

export interface Point {
  x: number
  y: number
}

export interface Rectangle {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface PlugPosition {
  id: LinkPoint 
  position: Point
}

export interface ModulePosition {
  id: string
  position: Rectangle
}

const isSamePoint = (a: Point, b: Point) => a.x === b.x && a.y === b.y
const isSameRect = (a: Rectangle, b: Rectangle) =>
  a.x1 === b.x1 && a.y1 === b.y1 && a.x2 === b.x2 && a.y2 === b.y2

export const createPositionStores = () => {
  const plugPositions = writable<Map<LinkPoint, PlugPosition>>(new Map())
  const modulePositions = writable<Map<string, ModulePosition>>(new Map())

  const registerPlug = (linkPoint: LinkPoint, element: Element) => {
    const workspace = document.querySelector('[data-kind="workspace"]')
    const workspaceRect = workspace!.getBoundingClientRect()
    const rect = element.getBoundingClientRect()

    const nextPosition: Point = {
      x: Math.floor(rect.left - workspaceRect.left + rect.width / 2),
      y: Math.floor(rect.top - workspaceRect.top + rect.height / 2)
    }

    if (get(plugPositions).has(linkPoint)) {
      const prevPosition = get(plugPositions).get(linkPoint)!.position
      if (isSamePoint(prevPosition, nextPosition)) return
    }

    plugPositions.update(positions => {
      positions.set(linkPoint, {
        id: linkPoint,
        position: nextPosition
      })
      return positions
    })
  }

  const registerModule = (moduleId: string, element: Element) => {
    const workspace = document.querySelector('[data-kind="workspace"]')
    const workspaceRect = workspace!.getBoundingClientRect()
    const rect = element.getBoundingClientRect()
    const nextPosition: Rectangle = {
      x1: Math.floor(rect.left - workspaceRect.left),
      y1: Math.floor(rect.top - workspaceRect.top),
      x2: Math.ceil(rect.right - workspaceRect.left),
      y2: Math.ceil(rect.bottom - workspaceRect.top)
    }

    if (get(modulePositions).has(moduleId)) {
      const prevPosition = get(modulePositions).get(moduleId)!.position
      if (isSameRect(prevPosition, nextPosition)) return
    }

    modulePositions.update(positions => {
      positions.set(moduleId, {
        id: moduleId,
        position: nextPosition
      })
      return positions
    })
  }

  const removeModule = (moduleId: string) => {
    modulePositions.update(positions => {
      positions.delete(moduleId)
      return positions
    })
  }

  const removePlug = (plugId: string) => {
    plugPositions.update(positions => {
      positions.delete(plugId)
      return positions
    })
  }

  return {
    plugPositions: readonly(plugPositions),
    modulePositions: readonly(modulePositions),
    removeModule,
    removePlug,
    registerPlug,
    registerModule
  }
}

export type PositionStore = ReturnType<typeof createPositionStores>
