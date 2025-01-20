import { readonly, writable } from 'svelte/store'

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
  id: string
  position: Point
}

export interface ModulePosition {
  id: string
  position: Rectangle
}

export const createPositionStores = () => {
  const plugPositions = writable<Map<string, PlugPosition>>(new Map())
  const modulePositions = writable<Map<string, ModulePosition>>(new Map())

  const registerPlug = (plugId: string, element: Element) => {
    const workspace = document.querySelector('[data-kind="workspace"]')
    const workspaceRect = workspace!.getBoundingClientRect()

    const rect = element.getBoundingClientRect()
    plugPositions.update(positions => {
      positions.set(plugId, {
        id: plugId,
        position: {
          x: Math.floor(rect.left - workspaceRect.left + rect.width / 2),
          y: Math.floor(rect.top - workspaceRect.top + rect.height / 2)
        }
      })
      return positions
    })
  }

  const registerModule = (moduleId: string, element: Element) => {
    const workspace = document.querySelector('[data-kind="workspace"]')
    const workspaceRect = workspace!.getBoundingClientRect()
    const rect = element.getBoundingClientRect()
    modulePositions.update(positions => {
      positions.set(moduleId, {
        id: moduleId,
        position: {
          x1: Math.floor(rect.left - workspaceRect.left),
          y1: Math.floor(rect.top - workspaceRect.top),
          x2: Math.ceil(rect.right - workspaceRect.left),
          y2: Math.ceil(rect.bottom - workspaceRect.top)
        }
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
