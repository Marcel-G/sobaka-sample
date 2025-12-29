import type { LinkPoint } from '@sobaka/state'
import { linkPointToKey, keyToLinkPoint } from '@sobaka/state/models/links'
import { get, readonly, writable } from 'svelte/store'
import { PositionObserver } from './positionObserver'
import { rafBatched } from './rafBatched'

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
  // Use string keys for stable Map lookups
  const plugPositions = writable<Map<string, PlugPosition>>(new Map())
  const modulePositions = writable<Map<string, ModulePosition>>(new Map())

  // Create a shared position observer instance
  const observer = new PositionObserver()

  // Track which elements we're observing
  const plugElements = new Map<string, Element>()
  const moduleElements = new Map<string, Element>()

  const updatePlugPosition = (linkPoint: LinkPoint, element: Element) => {
    const workspace = document.querySelector('[data-kind="workspace"]')
    const workspaceRect = workspace!.getBoundingClientRect()
    const rect = element.getBoundingClientRect()

    const nextPosition: Point = {
      x: Math.floor(rect.left - workspaceRect.left + rect.width / 2),
      y: Math.floor(rect.top - workspaceRect.top + rect.height / 2)
    }

    const key = linkPointToKey(linkPoint)
    const current = get(plugPositions)
    if (current.has(key)) {
      const prevPosition = current.get(key)!.position
      if (isSamePoint(prevPosition, nextPosition)) return
    }

    plugPositions.update(positions => {
      positions.set(key, {
        id: linkPoint,
        position: nextPosition
      })
      return positions
    })
  }

  const updateModulePosition = (moduleId: string, element: Element) => {
    const workspace = document.querySelector('[data-kind="workspace"]')
    const workspaceRect = workspace!.getBoundingClientRect()
    const rect = element.getBoundingClientRect()
    const nextPosition: Rectangle = {
      x1: Math.floor(rect.left - workspaceRect.left),
      y1: Math.floor(rect.top - workspaceRect.top),
      x2: Math.ceil(rect.right - workspaceRect.left),
      y2: Math.ceil(rect.bottom - workspaceRect.top)
    }

    const current = get(modulePositions)
    if (current.has(moduleId)) {
      const prevPosition = current.get(moduleId)!.position
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

  const registerPlug = (linkPoint: LinkPoint, element: Element): (() => void) => {
    const key = linkPointToKey(linkPoint)

    // Store element reference
    plugElements.set(key, element)

    // Start observing for changes (observer handles requestAnimationFrame for initial update)
    observer.observe(element, () => {
      updatePlugPosition(linkPoint, element)
    })

    // Return cleanup function
    return () => {
      removePlug(linkPoint)
    }
  }

  const registerModule = (moduleId: string, element: Element): (() => void) => {
    // Store element reference
    moduleElements.set(moduleId, element)

    // Start observing for changes (observer handles requestAnimationFrame for initial update)
    observer.observe(element, () => {
      updateModulePosition(moduleId, element)

      // When a module moves, also update all its plug positions
      // This is needed because plugs are positioned relative to their module
      const plugs = Array.from(plugElements.entries()).filter(([key]) => {
        const linkPoint = keyToLinkPoint(key)
        return linkPoint.moduleId === moduleId
      })

      for (const [key, plugElement] of plugs) {
        const linkPoint = keyToLinkPoint(key)
        updatePlugPosition(linkPoint, plugElement)
      }
    })

    // Return cleanup function
    return () => {
      removeModule(moduleId)
    }
  }

  const removeModule = (moduleId: string) => {
    // Stop observing
    const element = moduleElements.get(moduleId)
    if (element) {
      observer.unobserve(element)
      moduleElements.delete(moduleId)
    }

    modulePositions.update(positions => {
      positions.delete(moduleId)
      return positions
    })
  }

  const removePlug = (linkPoint: LinkPoint) => {
    const key = linkPointToKey(linkPoint)

    // Stop observing
    const element = plugElements.get(key)
    if (element) {
      observer.unobserve(element)
      plugElements.delete(key)
    }

    plugPositions.update(positions => {
      positions.delete(key)
      return positions
    })
  }

  const forceUpdateModule = (moduleId: string) => {
    const element = moduleElements.get(moduleId)
    if (element) {
      observer.forceUpdate(element)
    }
  }

  const destroy = () => {
    observer.destroy()
    plugElements.clear()
    moduleElements.clear()
  }

  return {
    // Wrap position stores with RAF batching - updates batched to once per frame
    plugPositions: rafBatched(readonly(plugPositions)),
    modulePositions: rafBatched(readonly(modulePositions)),
    removeModule,
    removePlug,
    registerPlug,
    registerModule,
    forceUpdateModule,
    destroy
  }
}

export type PositionStore = ReturnType<typeof createPositionStores>
