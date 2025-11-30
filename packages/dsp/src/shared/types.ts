import { PlugType } from "@sobaka/state"

export interface Route {
  /** The audio node to connect to */
  node: AudioNode | AudioParam
  /** Which input index on the audio node (default: 0) */
  connectIndex?: number
}

export interface RouteInfo {
  name: string,
  type: PlugType,
  label: string
}

/**
 * Base interface for all module DSP instances
 * Each module type (Clock, Oscillator, etc.) implements this interface
 */
export interface ModuleDSP {
  /** Unique identifier matching the module in state */
  readonly id: string

  /** 
   * Get routing definition for all routes in this module
   * Returns a map of routeName -> RouteInfo
   * Optional for now - modules can implement as needed
   */
  getRoutingDefinition?(): Record<string, RouteInfo>

  /** 
   * Declaratively define all routing for this module
   * This replaces the imperative getPlugContexts() method
   */
  getRoute(routeName: string): Route
  
  /** Clean up audio nodes and resources */
  destroy(): void
}

