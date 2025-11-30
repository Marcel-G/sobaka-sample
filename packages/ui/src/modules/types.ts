/**
 * UI-level routing metadata
 * Simplified version of DSP routing for UI rendering
 */
export interface PlugDefinition {
  index: number
  label: string
}

export interface UIRouting {
  inputs?: PlugDefinition[]
  outputs?: PlugDefinition[]
  params?: PlugDefinition[]
}

/**
 * Module metadata combining component and routing
 */
export interface ModuleMetadata {
  routing: UIRouting
}
