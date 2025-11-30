import type { Readable } from 'svelte/store'

/**
 * Props for Panel component - handles module container
 */
export interface PanelProps {
  name: string
  disabled?: boolean
  height?: number
  width?: number
  position: Readable<{ x: number; y: number }>
  
  // Callbacks
  onClose?: (() => void) | null
  onClone?: (() => void) | null
  onDrag?: ((x: number, y: number) => void) | null
  bindElement?: ((element: HTMLElement) => (() => void) | void) | null
  
  // Slots
  children?: import('svelte').Snippet
  inputs?: import('svelte').Snippet
  outputs?: import('svelte').Snippet
}

/**
 * Props for Plug component - handles individual plug connections
 */
export interface PlugProps {
  ctx: import('@sobaka/dsp').RouteInfo
  onClick?: ((routeName: string) => void) | null
  bindElement?: ((routeName: string, element: HTMLElement) => (() => void) | void) | null
}

/**
 * Common props shared across all module components
 * Each module should extend this with their specific props (like `node`)
 */
export interface BaseModuleProps {
  disabled?: boolean
  position: Readable<{ x: number; y: number }>
  
  // Panel callbacks
  onClose?: (() => void) | null
  onClone?: (() => void) | null
  onDrag?: ((x: number, y: number) => void) | null
  bindElement?: ((element: HTMLElement) => (() => void) | void) | null
  
  // Plug callbacks
  onPlugClick?: ((routeName: string) => void) | null
  bindPlugElement?: ((routeName: string, element: HTMLElement) => (() => void) | void) | null
}
